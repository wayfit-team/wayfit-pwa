import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { auth, useIsSignedIn } from '../lib/auth'
import { kakaoRedirectUri } from '../lib/kakao'
import { api } from './client'
import type { Coupon, StoreUpdate } from './types'

export const queryKeys = {
  coupons: ['coupons'] as const,
  devices: ['devices'] as const,
  ownerStores: ['owner', 'stores'] as const,
  stats: (storeId: string, days: 7 | 30) => ['owner', 'stats', storeId, days] as const,
}

// ── 카카오 로그인 (운전자·사장님 공통) ──

export function useKakaoLogin() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => api.kakaoLogin(code, kakaoRedirectUri()),
    onSuccess: ({ sessionToken }) => {
      // 이전 사용자의 캐시가 섞이지 않도록 비우고 시작
      client.clear()
      auth.setToken(sessionToken)
    },
  })
}

/** 서버 세션을 폐기하고(실패해도) 이 폰의 토큰·캐시를 지운다 */
export function useSignOut() {
  const client = useQueryClient()
  return async () => {
    await api.logout().catch(() => undefined)
    auth.clear()
    client.clear()
  }
}

// ── 운전자 ──

export function useCoupons() {
  const signedIn = useIsSignedIn()
  return useQuery({
    queryKey: queryKeys.coupons,
    queryFn: api.myCoupons,
    select: (data) => (Array.isArray(data) ? data : []),
    enabled: signedIn,
  })
}

export function useDevices() {
  const signedIn = useIsSignedIn()
  return useQuery({
    queryKey: queryKeys.devices,
    queryFn: api.myDevices,
    select: (data) => (Array.isArray(data) ? data : []),
    enabled: signedIn,
  })
}

export function useClaimPairing() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.claimPairing,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.coupons })
      void client.invalidateQueries({ queryKey: queryKeys.devices })
    },
  })
}

export function useUnlinkDevice() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.unlinkDevice,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.devices })
      void client.invalidateQueries({ queryKey: queryKeys.coupons })
    },
  })
}

export function useRedeem(couponId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (pin: string) => api.redeem(couponId, pin),
    onSuccess: (redeemed) => {
      client.setQueryData<Coupon[]>(queryKeys.coupons, (list) =>
        Array.isArray(list) ? list.map((c) => (c.id === redeemed.id ? redeemed : c)) : [redeemed],
      )
    },
    onError: () => {
      // 이미 사용·만료 등 서버 상태가 바뀌었을 수 있다
      void client.invalidateQueries({ queryKey: queryKeys.coupons })
    },
  })
}

// ── 사장님 ──

export function useOwnerStores() {
  const signedIn = useIsSignedIn()
  return useQuery({
    queryKey: queryKeys.ownerStores,
    queryFn: api.ownerStores,
    select: (data) => (Array.isArray(data) ? data : []),
    enabled: signedIn,
  })
}

export function useUpdateStore(storeId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (update: StoreUpdate) => api.updateStore(storeId, update),
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.ownerStores }),
  })
}

export function useStoreStats(storeId: string | undefined, days: 7 | 30) {
  const signedIn = useIsSignedIn()
  return useQuery({
    queryKey: queryKeys.stats(storeId ?? '', days),
    queryFn: () => api.storeStats(storeId!, days),
    enabled: signedIn && storeId !== undefined,
  })
}
