import { auth } from '../lib/auth'
import { ApiError, OfflineError, isApiErrorBody } from './errors'
import type {
  ClaimPairingResponse,
  Coupon,
  LinkedDevice,
  OwnerStore,
  SessionResponse,
  StoreStats,
  StoreUpdate,
} from './types'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/v1'

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

  // 세션이 만료·폐기됐으면 토큰과 캐시를 지워 로그인 화면으로 돌아가게 한다
  if (res.status === 401 && token) auth.clear()

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
  myDevices: () => request<LinkedDevice[]>('GET', '/me/devices', 'session'),
  unlinkDevice: (id: string) => request<void>('DELETE', `/me/devices/${id}`, 'session'),
  myCoupons: () => request<Coupon[]>('GET', '/me/coupons', 'session'),
  redeem: (couponId: string, pin: string) => request<Coupon>('POST', `/coupons/${couponId}/redeem`, 'session', { pin }),

  // 사장님
  ownerStores: () => request<OwnerStore[]>('GET', '/owner/stores', 'session'),
  updateStore: (id: string, update: StoreUpdate) => request<OwnerStore>('PATCH', `/owner/stores/${id}`, 'session', update),
  storeStats: (id: string, days: 7 | 30) => request<StoreStats>('GET', `/owner/stores/${id}/stats?days=${days}`, 'session'),
}
