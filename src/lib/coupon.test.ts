import { describe, expect, it } from 'vitest'
import type { Coupon } from '../api/types'
import { daysLeftLabel, effectiveStatus, formatCode, groupCoupons } from './coupon'

const NOW = new Date('2026-11-05T12:00:00+09:00')
const iso = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000).toISOString()

const coupon = (id: string, over: Partial<Coupon> = {}): Coupon => ({
  id,
  storeName: '가게',
  benefit: '혜택',
  code6: '123456',
  status: 'ISSUED',
  issuedAt: iso(-24),
  expiresAt: iso(72),
  ...over,
})

describe('effectiveStatus', () => {
  it('유효기간이 지난 ISSUED 는 오프라인 캐시라도 만료로 본다', () => {
    expect(effectiveStatus(coupon('a', { expiresAt: iso(-1) }), NOW)).toBe('EXPIRED')
    expect(effectiveStatus(coupon('a', { expiresAt: iso(1) }), NOW)).toBe('ISSUED')
  })

  it('사용 완료는 기간이 지나도 사용 완료', () => {
    expect(effectiveStatus(coupon('a', { status: 'REDEEMED', expiresAt: iso(-1) }), NOW)).toBe('REDEEMED')
  })
})

describe('groupCoupons', () => {
  it('사용 가능 / 사용 완료 / 만료로 나누고, 사용 가능은 만료 임박 순', () => {
    const groups = groupCoupons(
      [
        coupon('later', { expiresAt: iso(100) }),
        coupon('soon', { expiresAt: iso(5) }),
        coupon('used-old', { status: 'REDEEMED', redeemedAt: iso(-48) }),
        coupon('used-new', { status: 'REDEEMED', redeemedAt: iso(-2) }),
        coupon('gone', { expiresAt: iso(-3) }),
      ],
      NOW,
    )
    expect(groups.active.map((c) => c.id)).toEqual(['soon', 'later'])
    expect(groups.used.map((c) => c.id)).toEqual(['used-new', 'used-old'])
    expect(groups.expired.map((c) => c.id)).toEqual(['gone'])
  })
})

describe('daysLeftLabel', () => {
  it('하루 이내면 "오늘까지", 그 이상은 남은 일수', () => {
    expect(daysLeftLabel(iso(5), NOW)).toBe('오늘까지')
    expect(daysLeftLabel(iso(24 * 3), NOW)).toBe('3일 남음')
    expect(daysLeftLabel(iso(24 * 6 + 1), NOW)).toBe('7일 남음')
  })
})

it('쿠폰 코드는 3자리씩 띄어 보여준다', () => {
  expect(formatCode('303184')).toBe('303 184')
})
