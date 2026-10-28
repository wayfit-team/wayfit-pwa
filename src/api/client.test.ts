import { describe, expect, it, vi } from 'vitest'
import { auth } from '../lib/auth'
import { DEMO } from '../mocks/db'
import { api } from './client'
import { ApiError, OfflineError, errorMessage } from './errors'

async function signIn() {
  const { userToken } = await api.claimPairing(DEMO.validCode)
  auth.setUserToken(userToken)
}

async function expectApiError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status, code })
  return error as ApiError
}

describe('페어링 (Spec REQ-B15, B16, EDGE-B5)', () => {
  it('정상 코드면 사용자 토큰을 준다', async () => {
    const { userToken } = await api.claimPairing(DEMO.validCode)
    expect(userToken).toMatch(/^user-/)
  })

  it('만료 410, 이미 사용 409 — 사용자에게는 새 코드를 받으라고 안내', async () => {
    const expired = await expectApiError(api.claimPairing(DEMO.expiredCode), 410, 'PAIRING_CODE_EXPIRED')
    expect(errorMessage(expired)).toContain('새 코드')
    await expectApiError(api.claimPairing(DEMO.usedCode), 409, 'PAIRING_CODE_USED')
  })

  it('차 화면에 뜬 아무 8자리 코드나 연결된다 (백엔드 연동 전 목)', async () => {
    const { userToken } = await api.claimPairing('90261712')
    expect(userToken).toMatch(/^user-/)
  })

  it('없는 코드면 코드를 다시 확인하라고 안내', async () => {
    const e = await expectApiError(api.claimPairing(DEMO.unknownCode), 404, 'PAIRING_CODE_NOT_FOUND')
    expect(errorMessage(e)).toContain('8자리 코드를 다시 확인')
  })

  it('토큰 없이 쿠폰을 보면 401', async () => {
    await expectApiError(api.myCoupons(), 401, 'UNAUTHORIZED')
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

describe('사장님 (Spec REQ-B19, B20)', () => {
  it('틀린 비밀번호는 로그인 실패', async () => {
    const e = await expectApiError(api.ownerLogin(DEMO.ownerEmail, 'nope'), 401, 'LOGIN_FAILED')
    expect(errorMessage(e)).toBe('이메일 또는 비밀번호가 맞지 않아요')
  })

  it('혜택 문구는 40자를 넘을 수 없다', async () => {
    const { ownerToken } = await api.ownerLogin(DEMO.ownerEmail, DEMO.ownerPassword)
    auth.setOwnerToken(ownerToken)
    const e = await expectApiError(api.updateStore('s1', { benefitText: '가'.repeat(41) }), 400, 'VALIDATION_FAILED')
    expect(e.details.field).toBe('benefitText')
  })

  it('PIN 을 바꾸면 새 PIN 으로 쿠폰을 쓸 수 있다 (EDGE-B7)', async () => {
    const { ownerToken } = await api.ownerLogin(DEMO.ownerEmail, DEMO.ownerPassword)
    auth.setOwnerToken(ownerToken)
    await api.updateStore('s1', { pin: '9876' })

    await signIn()
    await expectApiError(api.redeem('c-coffee', DEMO.storePin), 422, 'PIN_INVALID')
    expect((await api.redeem('c-coffee', '9876')).status).toBe('REDEEMED')
  })
})
