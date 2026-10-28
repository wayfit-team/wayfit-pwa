import { HttpResponse, delay, http } from 'msw'
import type { StoreUpdate } from '../api/types'
import { DEMO, db, statsFor } from './db'

const API = '*/v1'

const PIN_MAX_FAILS = 5
const PIN_LOCK_MS = 15 * 60_000

function fail(status: number, code: string, message: string, details: Record<string, unknown> = {}) {
  return HttpResponse.json({ error: { code, message, details } }, { status })
}

function bearer(request: Request): string | null {
  return request.headers.get('Authorization')?.replace(/^Bearer\s+/, '') ?? null
}

function isUser(request: Request) {
  const token = bearer(request)
  return token !== null && db.userTokens.has(token)
}

function isOwner(request: Request) {
  return bearer(request) === db.ownerToken
}

const publicCoupon = ({ storeId: _storeId, ...coupon }: (typeof db.coupons)[number]) => coupon

export const handlers = [
  // ── 페어링 (Spec REQ-B15~B18) ──
  http.post(`${API}/pairing/claim`, async ({ request }) => {
    await delay(300)
    const { code } = (await request.json()) as { code?: string }
    if (!code || !/^\d{8}$/.test(code)) return fail(400, 'VALIDATION_FAILED', '8자리 숫자 코드')
    if (code === DEMO.expiredCode) return fail(410, 'PAIRING_CODE_EXPIRED', '만료된 코드')
    if (db.usedCodes.has(code)) return fail(409, 'PAIRING_CODE_USED', '이미 사용된 코드')
    if (code !== DEMO.validCode) return fail(404, 'NOT_FOUND', '없는 코드')
    // 같은 사용자가 다시 연결하면 기존 토큰 유지 (멱등)
    const token = bearer(request) && isUser(request) ? bearer(request)! : `user-${crypto.randomUUID()}`
    db.userTokens.add(token)
    return HttpResponse.json({ userToken: token })
  }),

  http.get(`${API}/me/devices`, ({ request }) => {
    if (!isUser(request)) return fail(401, 'UNAUTHORIZED', '토큰 없음')
    return HttpResponse.json(db.devices)
  }),

  http.delete(`${API}/me/devices/:id`, ({ request, params }) => {
    if (!isUser(request)) return fail(401, 'UNAUTHORIZED', '토큰 없음')
    db.devices = db.devices.filter((d) => d.id !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── 쿠폰 (REQ-B12~B14) ──
  http.get(`${API}/me/coupons`, async ({ request }) => {
    await delay(200)
    if (!isUser(request)) return fail(401, 'UNAUTHORIZED', '토큰 없음')
    if (db.devices.length === 0) return HttpResponse.json([])
    const now = Date.now()
    return HttpResponse.json(
      db.coupons.map((c) =>
        publicCoupon(c.status === 'ISSUED' && new Date(c.expiresAt).getTime() <= now ? { ...c, status: 'EXPIRED' } : c),
      ),
    )
  }),

  http.post(`${API}/coupons/:id/redeem`, async ({ request, params }) => {
    await delay(400)
    if (!isUser(request)) return fail(401, 'UNAUTHORIZED', '토큰 없음')
    const coupon = db.coupons.find((c) => c.id === params.id)
    if (!coupon) return fail(404, 'NOT_FOUND', '없는 쿠폰')
    if (coupon.status === 'REDEEMED') return fail(409, 'COUPON_ALREADY_REDEEMED', '이미 사용')
    if (coupon.status === 'EXPIRED' || new Date(coupon.expiresAt).getTime() <= Date.now()) {
      return fail(410, 'COUPON_EXPIRED', '만료')
    }

    const pin = db.pins.get(coupon.id) ?? { fails: 0, lockedUntil: 0 }
    if (pin.lockedUntil > Date.now()) {
      return fail(423, 'PIN_LOCKED', '잠김', { retryAfterSec: Math.ceil((pin.lockedUntil - Date.now()) / 1000) })
    }
    const { pin: entered } = (await request.json()) as { pin?: string }
    if (entered !== db.storePin) {
      pin.fails += 1
      if (pin.fails >= PIN_MAX_FAILS) {
        pin.fails = 0
        pin.lockedUntil = Date.now() + PIN_LOCK_MS
        db.pins.set(coupon.id, pin)
        return fail(423, 'PIN_LOCKED', '잠김', { retryAfterSec: PIN_LOCK_MS / 1000 })
      }
      db.pins.set(coupon.id, pin)
      return fail(422, 'PIN_INVALID', 'PIN 불일치', { remainingAttempts: PIN_MAX_FAILS - pin.fails })
    }

    db.pins.delete(coupon.id)
    coupon.status = 'REDEEMED'
    coupon.redeemedAt = new Date().toISOString()
    return HttpResponse.json(publicCoupon(coupon))
  }),

  // ── 사장님 (REQ-B19~B21) ──
  http.post(`${API}/owner/login`, async ({ request }) => {
    await delay(300)
    const { email, password } = (await request.json()) as { email?: string; password?: string }
    if (email !== DEMO.ownerEmail || password !== DEMO.ownerPassword) {
      return fail(401, 'LOGIN_FAILED', '로그인 실패')
    }
    return HttpResponse.json({ ownerToken: db.ownerToken })
  }),

  http.get(`${API}/owner/stores`, ({ request }) => {
    if (!isOwner(request)) return fail(401, 'UNAUTHORIZED', '토큰 없음')
    return HttpResponse.json(db.stores)
  }),

  http.patch(`${API}/owner/stores/:id`, async ({ request, params }) => {
    await delay(300)
    if (!isOwner(request)) return fail(401, 'UNAUTHORIZED', '토큰 없음')
    const store = db.stores.find((s) => s.id === params.id)
    if (!store) return fail(403, 'FORBIDDEN', '남의 매장')

    const { pin, ...update } = (await request.json()) as StoreUpdate
    if (update.benefitText !== undefined && (update.benefitText.trim().length === 0 || update.benefitText.length > 40)) {
      return fail(400, 'VALIDATION_FAILED', '혜택 문구는 1~40자', { field: 'benefitText' })
    }
    if (update.radiusM !== undefined && ![100, 150, 300].includes(update.radiusM)) {
      return fail(400, 'VALIDATION_FAILED', '반경은 100/150/300', { field: 'radiusM' })
    }
    if (pin !== undefined) {
      if (!/^\d{4}$/.test(pin)) return fail(400, 'VALIDATION_FAILED', 'PIN은 숫자 4자리', { field: 'pin' })
      db.storePin = pin
    }
    Object.assign(store, update)
    return HttpResponse.json(store)
  }),

  http.get(`${API}/owner/stores/:id/stats`, ({ request }) => {
    if (!isOwner(request)) return fail(401, 'UNAUTHORIZED', '토큰 없음')
    const days = Number(new URL(request.url).searchParams.get('days') ?? 7)
    return HttpResponse.json({ days: statsFor(days === 30 ? 30 : 7) })
  }),
]
