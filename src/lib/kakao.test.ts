import { afterEach, describe, expect, it } from 'vitest'
import { KAKAO_CALLBACK_PATH, MOCK_KAKAO_CODE, consumeKakaoState, safeReturnTo, startKakaoLogin } from './kakao'

afterEach(() => sessionStorage.clear())

describe('로그인 후 돌아갈 경로 (열린 리다이렉트 방지)', () => {
  it('앱 안의 경로만 허용한다', () => {
    expect(safeReturnTo('/pair?code=12345678')).toBe('/pair?code=12345678')
    expect(safeReturnTo('/owner')).toBe('/owner')
  })

  it('다른 사이트·스킴·콜백 자신은 기본 경로로 바꾼다', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '', null, undefined]) {
      expect(safeReturnTo(bad)).toBe('/coupons')
    }
    expect(safeReturnTo(`${KAKAO_CALLBACK_PATH}?code=x`)).toBe('/coupons')
  })
})

describe('state (로그인 CSRF 방지)', () => {
  it('시작할 때 만든 state 와 같아야 하고, 한 번 쓰면 사라진다', () => {
    const start = startKakaoLogin('/owner')
    expect(start.kind).toBe('internal') // 테스트는 목 모드
    const params = new URLSearchParams((start as { path: string }).path.split('?')[1])
    expect(params.get('code')).toBe(MOCK_KAKAO_CODE)

    const state = params.get('state')!
    expect(state).toMatch(/^[0-9a-f]{32}$/)
    expect(consumeKakaoState(state)).toEqual({ state, returnTo: '/owner' })
    expect(consumeKakaoState(state)).toBeNull()
  })

  it('다른 state 나 시작 기록이 없으면 거절한다', () => {
    startKakaoLogin('/coupons')
    expect(consumeKakaoState('forged')).toBeNull()
    expect(consumeKakaoState(null)).toBeNull()
  })

  it('매번 다른 state 를 만든다', () => {
    const a = new URLSearchParams((startKakaoLogin('/') as { path: string }).path.split('?')[1]).get('state')
    const b = new URLSearchParams((startKakaoLogin('/') as { path: string }).path.split('?')[1]).get('state')
    expect(a).not.toBe(b)
  })
})
