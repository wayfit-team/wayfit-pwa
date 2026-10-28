import type { Coupon, DailyStat, LinkedDevice, OwnerStore } from '../api/types'

/**
 * 백엔드 연동 전 목 데이터. 데모 시나리오:
 * - 연결 코드: 차 화면에 뜬 아무 8자리 코드나 연결된다 (백엔드가 없어 차와 코드를 맞출 수 없으므로)
 *   단, 오류 화면 시연용: 00000000 = 만료, 11111111 = 이미 사용, 99999999 = 없는 코드
 * - 매장 PIN 1234, 5회 틀리면 15분 잠금
 * - 사장님 owner@wayfit.app / wayfit1234
 */
export const DEMO = {
  validCode: '12345678',
  expiredCode: '00000000',
  usedCode: '11111111',
  unknownCode: '99999999',
  storePin: '1234',
  ownerEmail: 'owner@wayfit.app',
  ownerPassword: 'wayfit1234',
} as const

const DAY = 86_400_000

interface PinState {
  fails: number
  lockedUntil: number
}

interface Db {
  userTokens: Set<string>
  devices: LinkedDevice[]
  usedCodes: Set<string>
  coupons: (Coupon & { storeId: string })[]
  stores: OwnerStore[]
  ownerToken: string
  pins: Map<string, PinState>
  storePin: string
}

function seed(now = Date.now()): Db {
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString()
  return {
    userTokens: new Set(),
    devices: [{ id: 'car-1', label: '아이오닉 5 · Pleos', linkedAt: iso(-2 * DAY) }],
    usedCodes: new Set([DEMO.usedCode]),
    coupons: [
      {
        id: 'c-coffee', storeId: 's1', storeName: '광교 모퉁이커피', benefit: '아메리카노 1잔 무료', code6: '303184',
        status: 'ISSUED', issuedAt: iso(-1 * 3_600_000), expiresAt: iso(7 * DAY),
      },
      {
        id: 'c-brew', storeId: 's2', storeName: '아주대 앞 브루잉랩', benefit: '음료 사이즈 업', code6: '482913',
        status: 'ISSUED', issuedAt: iso(-2 * DAY), expiresAt: iso(DAY / 2),
      },
      {
        id: 'c-tteok', storeId: 's3', storeName: '영통 떡볶이연구소', benefit: '튀김 1인분 서비스', code6: '730154',
        status: 'REDEEMED', issuedAt: iso(-5 * DAY), expiresAt: iso(2 * DAY), redeemedAt: iso(-4 * DAY),
      },
      {
        id: 'c-bread', storeId: 's4', storeName: '매탄 아침빵집', benefit: '소금빵 1개 증정', code6: '115620',
        status: 'EXPIRED', issuedAt: iso(-10 * DAY), expiresAt: iso(-3 * DAY),
      },
    ],
    stores: [
      {
        id: 's1', name: '광교 모퉁이커피', category: 'CAFE', address: '경기 수원시 영통구 광교중앙로 140',
        lat: 37.2842, lng: 127.053, benefitText: '아메리카노 1잔 무료', radiusM: 150, paused: false,
        openHours: {
          mon: { open: '08:00', close: '21:00' }, tue: { open: '08:00', close: '21:00' },
          wed: { open: '08:00', close: '21:00' }, thu: { open: '08:00', close: '21:00' },
          fri: { open: '08:00', close: '22:00' }, sat: { open: '10:00', close: '22:00' }, sun: null,
        },
      },
    ],
    ownerToken: 'owner-demo-token',
    pins: new Map(),
    storePin: DEMO.storePin,
  }
}

export let db: Db = seed()

export function resetDb() {
  db = seed()
}

/** 최근 [days]일 통계. 날짜로 정해지는 가짜 값이라 새로고침해도 같다 */
export function statsFor(days: number, now = new Date()): DailyStat[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getTime() - (days - 1 - i) * DAY)
    const n = d.getDate() + d.getMonth() * 31
    const impressions = 40 + ((n * 37) % 45)
    const accepts = Math.round(impressions * (0.18 + ((n * 13) % 9) / 100))
    const visits = Math.round(accepts * 0.72)
    const redemptions = Math.round(visits * 0.8)
    return { date: d.toISOString().slice(0, 10), impressions, accepts, visits, redemptions }
  })
}
