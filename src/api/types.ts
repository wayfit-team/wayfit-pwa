/** 백엔드 Spec(Data Contracts)과 같은 모양. 바뀌면 여기와 mocks/db.ts 를 같이 고친다 */

export type CouponStatus = 'ISSUED' | 'REDEEMED' | 'EXPIRED'

export interface Coupon {
  id: string
  storeName: string
  benefit: string
  code6: string
  status: CouponStatus
  issuedAt: string
  expiresAt: string
  redeemedAt?: string
}

export interface LinkedDevice {
  id: string
  label: string
  linkedAt: string
}

export type StoreCategory = 'CAFE' | 'FOOD' | 'BAKERY' | 'ETC'

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface OpenHours {
  open: string // "09:00"
  close: string // "21:00"
}

export interface OwnerStore {
  id: string
  name: string
  category: StoreCategory
  address: string
  lat: number
  lng: number
  benefitText: string
  radiusM: 100 | 150 | 300
  openHours: Record<Weekday, OpenHours | null>
  paused: boolean
}

/** 서버 UpdateOwnerStoreRequest: PIN 은 pinCode 로 보낸다 (pin 은 서버가 모르는 필드라 무시된다) */
export type StoreUpdate = Partial<Omit<OwnerStore, 'id'>> & { pinCode?: string }

export interface DailyStat {
  date: string // YYYY-MM-DD
  impressions: number
  accepts: number
  visits: number
  redemptions: number
}

export interface StoreStats {
  days: DailyStat[]
}

export interface SessionResponse {
  sessionToken: string
  expiresAt: string
}

export interface ClaimPairingResponse {
  kakaoUserId: string
  deviceId: string
  linkedAt: string
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, unknown> }
}
