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

/** 카카오 로그인 세션. 목에는 계정이 하나라 운전자이자 매장 s1 의 사장님이다 */
function isUser(request: Request) {
  const token = bearer(request)
  return token !== null && db.sessions.has(token)
}

const isOwner = isUser

/**
 * crypto.randomUUID 는 보안 출처(https·localhost)에서만 있다.
 * 폰으로 같은 와이파이의 http://192.168.x.x:5173 에 접속하면 없어서 500 이 났다 → 대체 생성
 */
function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const publicCoupon = ({ storeId: _storeId, ...coupon }: (typeof db.coupons)[number]) => coupon

export const handlers = [
  // ── 카카오 로그인 (백엔드 POST /v1/auth/kakao, /v1/auth/logout) ──
  http.post(`${API}/auth/kakao`, async ({ request }) => {
    await delay(300)
    const { code, redirectUri } = (await request.json()) as { code?: string; redirectUri?: string }
    if (!code || !redirectUri?.endsWith('/auth/kakao/callback')) return fail(400, 'VALIDATION_FAILED', '형식 오류')
    if (code === DEMO.badKakaoCode) return fail(401, 'KAKAO_AUTH_FAILED', '카카오 거절', { kakaoErrorCode: 'KOE320' })
    const sessionToken = `wfs_mock_${randomId()}`
    db.sessions.add(sessionToken)
    return HttpResponse.json({ sessionToken, expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString() })
  }),

  http.post(`${API}/auth/logout`, ({ request }) => {
    const token = bearer(request)
    if (token) db.sessions.delete(token)
    return new HttpResponse(null, { status: 204 })
  }),

  // ── 페어링 (Spec REQ-B15~B18) ──
  http.post(`${API}/pairing/claim`, async ({ request }) => {
    await delay(300)
    if (!isUser(request)) return fail(401, 'UNAUTHORIZED', '로그인 필요')
    const { code } = (await request.json()) as { code?: string }
    if (!code || !/^\d{8}$/.test(code)) return fail(400, 'VALIDATION_FAILED', '8자리 숫자 코드')
    if (code === DEMO.expiredCode) return fail(410, 'PAIRING_CODE_EXPIRED', '만료된 코드')
    if (db.usedCodes.has(code)) return fail(409, 'PAIRING_CODE_USED', '이미 사용된 코드')
    if (code === DEMO.unknownCode) return fail(404, 'PAIRING_CODE_NOT_FOUND', '없는 코드')
    db.usedCodes.add(code)
    const device = db.devices[0]
    return HttpResponse.json({ kakaoUserId: 'mock-kakao-user', deviceId: device?.id ?? 'car-1', linkedAt: new Date().toISOString() })
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
  http.get(`${API}/owner/stores`, ({ request }) => {
    if (!isOwner(request)) return fail(401, 'UNAUTHORIZED', '토큰 없음')
    return HttpResponse.json(db.stores)
  }),

  http.patch(`${API}/owner/stores/:id`, async ({ request, params }) => {
    await delay(300)
    if (!isOwner(request)) return fail(401, 'UNAUTHORIZED', '토큰 없음')
    const store = db.stores.find((s) => s.id === params.id)
    if (!store) return fail(403, 'FORBIDDEN', '남의 매장')

    // 실제 서버처럼 PIN 은 pinCode 로만 받는다 (모르는 필드는 무시)
    const { pinCode: pin, ...update } = (await request.json()) as StoreUpdate & { pin?: unknown }
    delete update.pin
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
