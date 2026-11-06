import { auth } from '../lib/auth'
import { ApiError, OfflineError, isApiErrorBody } from './errors'
import type {
  ClaimPairingResponse,
  Coupon,
  DailyStat,
  LinkedDevice,
  OwnerStore,
  SessionResponse,
  StoreStats,
  StoreUpdate,
} from './types'

const BASE = ((import.meta.env.VITE_API_BASE as string | undefined)?.trim() || '/v1').replace(/\/+$/, '')

/** 백엔드가 목록을 배열 그대로 주든 `{ coupons: [...] }` 처럼 감싸서 주든 배열로 꺼낸다 */
function unwrapList<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (Array.isArray(record[key])) return record[key] as T[]
    if (Array.isArray(record.items)) return record.items as T[]
  }
  return []
}

function unwrapItem<T>(data: unknown, key: string): T {
  if (data && typeof data === 'object' && key in data) {
    const inner = (data as Record<string, unknown>)[key]
    if (inner && typeof inner === 'object') return inner as T
  }
  return data as T
}

function normalizeDevice(raw: LinkedDevice & { deviceId?: string }): LinkedDevice {
  const id = raw.id ?? raw.deviceId ?? ''
  return {
    ...raw,
    id,
    label: raw.label || id || '내 차',
  }
}

function normalizeCoupon(raw: Coupon & { benefitText?: string }): Coupon {
  return {
    ...raw,
    benefit: raw.benefit ?? raw.benefitText ?? '',
    redeemedAt: raw.redeemedAt ?? undefined,
  }
}

type Who = 'session' | 'none'

async function request<T>(method: string, path: string, who: Who, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = who === 'session' ? auth.token() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    // 상대 경로('/v1')면 현재 출처 기준으로 — 테스트(jsdom)의 fetch 는 상대 URL 을 받지 않는다
    const url = new URL(`${BASE}${path}`, window.location.origin)
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new OfflineError()
  }

  // 세션이 만료·폐기됐으면(그 요청의 토큰이 아직 현재 토큰일 때만) 토큰과 캐시를 지워 로그인 화면으로 돌아가게 한다
  if (res.status === 401 && token && auth.token() === token) auth.clear()

  if (res.status === 204) return undefined as T
  const json: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    if (isApiErrorBody(json)) {
      throw new ApiError(res.status, json.error.code, json.error.message, json.error.details ?? {})
    }
    throw new ApiError(res.status, 'UNKNOWN', `HTTP ${res.status}`)
  }
  return json as T
}

export const api = {
  // 카카오 로그인 (운전자·사장님 공통)
  kakaoLogin: (code: string, redirectUri: string) =>
    request<SessionResponse>('POST', '/auth/kakao', 'none', { code, redirectUri }),
  logout: () => request<void>('POST', '/auth/logout', 'session'),

  // 운전자
  claimPairing: (code: string) => request<ClaimPairingResponse>('POST', '/pairing/claim', 'session', { code }),
  myDevices: async (): Promise<LinkedDevice[]> =>
    unwrapList<LinkedDevice>(await request('GET', '/me/devices', 'session'), 'devices').map(normalizeDevice),
  unlinkDevice: (id: string) => request<void>('DELETE', `/me/devices/${id}`, 'session'),
  myCoupons: async (): Promise<Coupon[]> =>
    unwrapList<Coupon>(await request('GET', '/me/coupons', 'session'), 'coupons').map(normalizeCoupon),
  redeem: async (couponId: string, pin: string): Promise<Coupon> =>
    normalizeCoupon(unwrapItem<Coupon>(await request('POST', `/coupons/${couponId}/redeem`, 'session', { pin }), 'coupon')),

  // 사장님
  ownerStores: async (): Promise<OwnerStore[]> =>
    unwrapList<OwnerStore>(await request('GET', '/owner/stores', 'session'), 'stores'),
  updateStore: async (id: string, update: StoreUpdate): Promise<OwnerStore> =>
    unwrapItem<OwnerStore>(await request('PATCH', `/owner/stores/${id}`, 'session', update), 'store'),
  storeStats: async (id: string, days: 7 | 30): Promise<StoreStats> => ({
    days: unwrapList<DailyStat>(await request('GET', `/owner/stores/${id}/stats?days=${days}`, 'session'), 'days'),
  }),
}
