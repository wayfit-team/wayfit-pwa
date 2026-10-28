import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { auth } from '../lib/auth'
import { api } from './client'
import type { Coupon, StoreUpdate } from './types'

export const queryKeys = {
  coupons: ['coupons'] as const,
  devices: ['devices'] as const,
  ownerStores: ['owner', 'stores'] as const,
  stats: (storeId: string, days: 7 | 30) => ['owner', 'stats', storeId, days] as const,
}

// ── 운전자 ──

export function useCoupons() {
  return useQuery({ queryKey: queryKeys.coupons, queryFn: api.myCoupons, enabled: auth.userToken() !== null })
}

export function useDevices() {
  return useQuery({ queryKey: queryKeys.devices, queryFn: api.myDevices, enabled: auth.userToken() !== null })
}

export function useClaimPairing() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.claimPairing,
    onSuccess: ({ userToken }) => {
      auth.setUserToken(userToken)
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
      client.setQueryData<Coupon[]>(queryKeys.coupons, (list) => list?.map((c) => (c.id === redeemed.id ? redeemed : c)))
    },
    onError: () => {
      // 이미 사용·만료 등 서버 상태가 바뀌었을 수 있다
      void client.invalidateQueries({ queryKey: queryKeys.coupons })
    },
  })
}

// ── 사장님 ──

export function useOwnerLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.ownerLogin(email, password),
    onSuccess: ({ ownerToken }) => auth.setOwnerToken(ownerToken),
  })
}

export function useOwnerStores() {
  return useQuery({ queryKey: queryKeys.ownerStores, queryFn: api.ownerStores, enabled: auth.ownerToken() !== null })
}

export function useUpdateStore(storeId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (update: StoreUpdate) => api.updateStore(storeId, update),
    onSuccess: () => void client.invalidateQueries({ queryKey: queryKeys.ownerStores }),
  })
}

export function useStoreStats(storeId: string | undefined, days: 7 | 30) {
  return useQuery({
    queryKey: queryKeys.stats(storeId ?? '', days),
    queryFn: () => api.storeStats(storeId!, days),
    enabled: storeId !== undefined,
  })
}
