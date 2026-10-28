import { expect, it } from 'vitest'
import { percent, totals } from './stats'

it('합계와 전환율 (노출→방문, 방문→사용)', () => {
  const t = totals([
    { date: '2026-11-01', impressions: 100, accepts: 20, visits: 15, redemptions: 12 },
    { date: '2026-11-02', impressions: 100, accepts: 30, visits: 25, redemptions: 18 },
  ])
  expect(t).toMatchObject({ impressions: 200, accepts: 50, visits: 40, redemptions: 30 })
  expect(percent(t.visitRate)).toBe('20%')
  expect(percent(t.redeemRate)).toBe('75%')
})

it('기록이 없으면 전환율 0 (0으로 나누지 않음)', () => {
  const t = totals([])
  expect(t.visitRate).toBe(0)
  expect(t.redeemRate).toBe(0)
})
