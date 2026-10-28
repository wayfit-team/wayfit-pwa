import { auth } from '../lib/auth'
import { ApiError, OfflineError, isApiErrorBody } from './errors'
import type { Coupon, LinkedDevice, OwnerStore, StoreStats, StoreUpdate } from './types'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/v1'

type Who = 'user' | 'owner' | 'none'

async function request<T>(method: string, path: string, who: Who, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = who === 'user' ? auth.userToken() : who === 'owner' ? auth.ownerToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    // 상대 경로('/v1')면 현재 출처 기준으로 — 테스트(jsdom)의 fetch 는 상대 URL 을 받지 않는다
    const url = new URL(`${BASE}${path}`, window.location.origin)
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new OfflineError()
  }

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
  // 운전자
  claimPairing: (code: string) => request<{ userToken: string }>('POST', '/pairing/claim', 'user', { code }),
  myDevices: () => request<LinkedDevice[]>('GET', '/me/devices', 'user'),
  unlinkDevice: (id: string) => request<void>('DELETE', `/me/devices/${id}`, 'user'),
  myCoupons: () => request<Coupon[]>('GET', '/me/coupons', 'user'),
  redeem: (couponId: string, pin: string) => request<Coupon>('POST', `/coupons/${couponId}/redeem`, 'user', { pin }),

  // 사장님
  ownerLogin: (email: string, password: string) =>
    request<{ ownerToken: string }>('POST', '/owner/login', 'none', { email, password }),
  ownerStores: () => request<OwnerStore[]>('GET', '/owner/stores', 'owner'),
  updateStore: (id: string, update: StoreUpdate) => request<OwnerStore>('PATCH', `/owner/stores/${id}`, 'owner', update),
  storeStats: (id: string, days: 7 | 30) => request<StoreStats>('GET', `/owner/stores/${id}/stats?days=${days}`, 'owner'),
}
