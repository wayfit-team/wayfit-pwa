import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { auth } from '../lib/auth'
import { kakaoRedirectUri } from '../lib/kakao'
import { DEMO, db } from '../mocks/db'
import { server } from '../mocks/node'
import { signIn } from '../test/render'
import { api } from './client'
import { ApiError, OfflineError, errorMessage } from './errors'

async function expectApiError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status, code })
  return error as ApiError
}

describe('카카오 로그인 (백엔드 /v1/auth/kakao)', () => {
  it('인가 코드를 넘기면 세션 토큰을 준다', async () => {
    const { sessionToken } = await api.kakaoLogin(DEMO.kakaoCode, kakaoRedirectUri())
    expect(sessionToken).toMatch(/^wfs_/)
  })

  it('카카오가 거절하면 다시 시도하라고 안내', async () => {
    const e = await expectApiError(api.kakaoLogin(DEMO.badKakaoCode, kakaoRedirectUri()), 401, 'KAKAO_AUTH_FAILED')
    expect(errorMessage(e)).toBe('카카오 로그인에 실패했어요. 다시 시도해 주세요')
  })

  it('로그아웃하면 세션이 폐기되고, 그 토큰으로 부르면 401 과 함께 이 폰의 세션도 지운다', async () => {
    await signIn()
    await api.logout()
    expect(auth.isSignedIn()).toBe(true) // 로그아웃 API 자체는 토큰을 지우지 않는다 (useSignOut 이 지움)
    await expectApiError(api.myCoupons(), 401, 'UNAUTHORIZED')
    expect(auth.isSignedIn()).toBe(false)
  })

  it('이전 토큰으로 나간 요청이 늦게 401 로 돌아와도 그 사이에 바뀐 새 토큰은 지우지 않는다', async () => {
    auth.setToken('wfs_old')
    const staleRequest = api.myCoupons()
    auth.setToken('wfs_new')
    await expectApiError(staleRequest, 401, 'UNAUTHORIZED')
    expect(auth.token()).toBe('wfs_new')
  })

  it('세션이 지워지면 영속 쿼리 캐시도 지운다 (공용 폰)', async () => {
    localStorage.setItem('wf.queryCache', '{"coupons":[]}')
    auth.setToken('wfs_x')
    auth.clear()
    expect(localStorage.getItem('wf.queryCache')).toBeNull()
    expect(auth.token()).toBeNull()
  })
})

describe('페어링 (Spec REQ-B15, B16, EDGE-B5)', () => {
  it('로그인 없이 연결하면 401', async () => {
    await expectApiError(api.claimPairing(DEMO.validCode), 401, 'UNAUTHORIZED')
  })

  it('정상 코드면 내 카카오 계정에 차가 연결된다', async () => {
    await signIn()
    const linked = await api.claimPairing(DEMO.validCode)
    expect(linked.deviceId).toBe('car-1')
  })

  it('만료 410, 이미 사용 409 — 사용자에게는 새 코드를 받으라고 안내', async () => {
    await signIn()
    const expired = await expectApiError(api.claimPairing(DEMO.expiredCode), 410, 'PAIRING_CODE_EXPIRED')
    expect(errorMessage(expired)).toContain('새 코드')
    await expectApiError(api.claimPairing(DEMO.usedCode), 409, 'PAIRING_CODE_USED')
  })

  it('차 화면에 뜬 아무 8자리 코드나 연결된다 (백엔드 연동 전 목)', async () => {
    await signIn()
    expect((await api.claimPairing('90261712')).deviceId).toBe('car-1')
  })

  it('없는 코드면 코드를 다시 확인하라고 안내', async () => {
    await signIn()
    const e = await expectApiError(api.claimPairing(DEMO.unknownCode), 404, 'PAIRING_CODE_NOT_FOUND')
    expect(errorMessage(e)).toContain('8자리 코드를 다시 확인')
  })

  it('토큰 없이 쿠폰을 보면 401', async () => {
    await expectApiError(api.myCoupons(), 401, 'UNAUTHORIZED')
  })
})

describe('쿠폰 내용', () => {
  it('서버가 주는 발급 시점 매장 이름·혜택(storeNameSnapshot·benefitSnapshot)을 보여준다', async () => {
    await signIn()
    const coffee = (await api.myCoupons()).find((c) => c.id === 'c-coffee')
    expect(coffee).toMatchObject({ storeName: '광교 모퉁이커피', benefit: '아메리카노 1잔 무료' })
    expect(coffee).not.toHaveProperty('storeNameSnapshot')
  })

  it('사용 처리 응답의 쿠폰도 매장 이름·혜택을 채운다', async () => {
    await signIn()
    const redeemed = await api.redeem('c-coffee', DEMO.storePin)
    expect(redeemed).toMatchObject({ storeName: '광교 모퉁이커피', benefit: '아메리카노 1잔 무료' })
  })
})

describe('쿠폰 사용 처리 (Spec REQ-B13, EDGE-B6)', () => {
  it('PIN이 맞으면 사용 완료, 같은 쿠폰을 다시 쓰면 409', async () => {
    await signIn()
    const redeemed = await api.redeem('c-coffee', DEMO.storePin)
    expect(redeemed.status).toBe('REDEEMED')
    expect(redeemed.redeemedAt).toBeDefined()

    await expectApiError(api.redeem('c-coffee', DEMO.storePin), 409, 'COUPON_ALREADY_REDEEMED')
  })

  it('PIN을 틀리면 남은 횟수를 알려주고, 5번 틀리면 15분 잠근다', async () => {
    await signIn()
    for (const left of [4, 3, 2, 1]) {
      const e = await expectApiError(api.redeem('c-coffee', '0000'), 422, 'PIN_INVALID')
      expect(e.details.remainingAttempts).toBe(left)
    }
    const locked = await expectApiError(api.redeem('c-coffee', '0000'), 423, 'PIN_LOCKED')
    expect(locked.details.retryAfterSec).toBe(900)

    // 잠긴 동안은 맞는 PIN 도 막힌다
    await expectApiError(api.redeem('c-coffee', DEMO.storePin), 423, 'PIN_LOCKED')
  })

  it('만료된 쿠폰은 410', async () => {
    await signIn()
    await expectApiError(api.redeem('c-bread', DEMO.storePin), 410, 'COUPON_EXPIRED')
  })
})

it('네트워크가 끊기면 OfflineError (사용 처리는 온라인에서만, REQ-P6)', async () => {
  const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))
  const error = await api.myCoupons().catch((e: unknown) => e)
  expect(error).toBeInstanceOf(OfflineError)
  expect(errorMessage(error)).toBe('인터넷에 연결되어 있지 않아요')
  spy.mockRestore()
})

describe('응답 래핑 호환', () => {
  it('백엔드가 목록을 { coupons }, { devices }, { stores } 객체로 감싸서 내려줘도 배열로 풀어서 반환한다', async () => {
    await signIn()
    server.use(
      http.get('*/v1/me/coupons', () => HttpResponse.json({ coupons: db.coupons })),
      http.get('*/v1/me/devices', () => HttpResponse.json({ devices: [{ deviceId: 'car-9', linkedAt: '2026-11-01T00:00:00Z' }] })),
      http.get('*/v1/owner/stores', () => HttpResponse.json({ stores: db.stores })),
    )

    const coupons = await api.myCoupons()
    expect(Array.isArray(coupons)).toBe(true)
    expect(coupons).toHaveLength(db.coupons.length)

    const devices = await api.myDevices()
    expect(devices).toEqual([{ deviceId: 'car-9', id: 'car-9', label: 'car-9', linkedAt: '2026-11-01T00:00:00Z' }])

    const stores = await api.ownerStores()
    expect(Array.isArray(stores)).toBe(true)
    expect(stores).toHaveLength(db.stores.length)
  })
})

describe('사장님 (Spec REQ-B19, B20)', () => {
  it('로그인하지 않으면 매장을 볼 수 없다', async () => {
    await expectApiError(api.ownerStores(), 401, 'UNAUTHORIZED')
  })

  it('혜택 문구는 40자를 넘을 수 없다', async () => {
    await signIn()
    const e = await expectApiError(api.updateStore('s1', { benefitText: '가'.repeat(41) }), 400, 'VALIDATION_FAILED')
    expect(e.details.field).toBe('benefitText')
  })

  it('PIN 을 바꾸면 새 PIN 으로 쿠폰을 쓸 수 있다 (EDGE-B7)', async () => {
    await signIn()
    await api.updateStore('s1', { pinCode: '9876' })

    await expectApiError(api.redeem('c-coffee', DEMO.storePin), 422, 'PIN_INVALID')
    expect((await api.redeem('c-coffee', '9876')).status).toBe('REDEEMED')
  })
})
