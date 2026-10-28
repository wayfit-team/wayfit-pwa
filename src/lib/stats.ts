import type { DailyStat } from '../api/types'

export interface StatTotals {
  impressions: number
  accepts: number
  visits: number
  redemptions: number
  /** 노출 → 인증 방문 */
  visitRate: number
  /** 인증 방문 → 쿠폰 사용 */
  redeemRate: number
}

export function totals(days: DailyStat[]): StatTotals {
  const sum = (k: keyof Omit<DailyStat, 'date'>) => days.reduce((acc, d) => acc + d[k], 0)
  const impressions = sum('impressions')
  const accepts = sum('accepts')
  const visits = sum('visits')
  const redemptions = sum('redemptions')
  return {
    impressions,
    accepts,
    visits,
    redemptions,
    visitRate: impressions === 0 ? 0 : visits / impressions,
    redeemRate: visits === 0 ? 0 : redemptions / visits,
  }
}

export const percent = (ratio: number) => `${Math.round(ratio * 1000) / 10}%`
