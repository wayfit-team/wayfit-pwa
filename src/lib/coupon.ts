import type { Coupon } from '../api/types'

export type CouponTab = 'active' | 'used' | 'expired'

/** 유효기간이 지난 ISSUED 는 서버가 EXPIRED 로 주지만, 캐시된 목록을 오프라인에서 볼 때를 위해 화면에서도 판단 */
export function effectiveStatus(coupon: Coupon, now: Date = new Date()): Coupon['status'] {
  if (coupon.status === 'ISSUED' && new Date(coupon.expiresAt) <= now) return 'EXPIRED'
  return coupon.status
}

export function groupCoupons(coupons: Coupon[], now: Date = new Date()): Record<CouponTab, Coupon[]> {
  const groups: Record<CouponTab, Coupon[]> = { active: [], used: [], expired: [] }
  for (const c of coupons) {
    const status = effectiveStatus(c, now)
    groups[status === 'ISSUED' ? 'active' : status === 'REDEEMED' ? 'used' : 'expired'].push(c)
  }
  // 사용 가능: 만료 임박 순 / 사용 완료: 최근 사용 순 (Spec REQ-P3)
  groups.active.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
  groups.used.sort((a, b) => (b.redeemedAt ?? '').localeCompare(a.redeemedAt ?? ''))
  groups.expired.sort((a, b) => b.expiresAt.localeCompare(a.expiresAt))
  return groups
}

/** 남은 날짜 표시: "오늘까지", "3일 남음" */
export function daysLeftLabel(expiresAt: string, now: Date = new Date()): string {
  const ms = new Date(expiresAt).getTime() - now.getTime()
  const days = Math.ceil(ms / 86_400_000)
  if (days <= 1) return '오늘까지'
  return `${days}일 남음`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatCode(code6: string): string {
  return `${code6.slice(0, 3)} ${code6.slice(3)}`
}
