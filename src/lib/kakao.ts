import { useMock } from './env'

/**
 * 카카오 로그인 (인가 코드 방식). 코드 교환은 백엔드가 Client Secret 으로 한다 — 브라우저에는 비밀값이 없다.
 * 카카오는 PKCE 를 지원하지 않으므로 state 로 로그인 CSRF 를 막는다.
 */
export const KAKAO_CALLBACK_PATH = '/auth/kakao/callback'
const AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize'
const PENDING_KEY = 'wf.kakaoLogin'
/** 목 모드에서 콜백으로 넘기는 가짜 인가 코드 */
export const MOCK_KAKAO_CODE = 'mock-kakao-code'

interface Pending {
  state: string
  returnTo: string
}

export function kakaoRedirectUri(): string {
  return `${window.location.origin}${KAKAO_CALLBACK_PATH}`
}

/** 로그인 후 돌아갈 곳은 이 앱 안의 경로만 (열린 리다이렉트 방지) */
export function safeReturnTo(path: string | null | undefined, fallback = '/coupons'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return fallback
  if (path.startsWith(KAKAO_CALLBACK_PATH)) return fallback
  return path
}

function randomState(): string {
  // getRandomValues 는 http(같은 와이파이 IP 접속)에서도 쓸 수 있다
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export type KakaoLoginStart = { kind: 'external'; url: string } | { kind: 'internal'; path: string } | { kind: 'unconfigured' }

/**
 * 로그인 시작. 실제 모드는 카카오로 나가고(external), 목 모드는 콜백으로 바로 돌아온다(internal).
 * 목 모드에서 새로고침하면 목 DB 가 초기화되므로 라우터 안에서 이동한다
 */
export function startKakaoLogin(returnTo: string): KakaoLoginStart {
  const clientId = import.meta.env.VITE_KAKAO_REST_API_KEY as string | undefined
  if (!useMock && !clientId) return { kind: 'unconfigured' }

  const state = randomState()
  const pending: Pending = { state, returnTo: safeReturnTo(returnTo) }
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  } catch {
    // 저장소를 못 쓰면 콜백에서 state 확인이 실패해 로그인이 거절된다 (안전한 쪽으로 실패)
  }

  if (useMock) {
    return { kind: 'internal', path: `${KAKAO_CALLBACK_PATH}?${new URLSearchParams({ code: MOCK_KAKAO_CODE, state })}` }
  }
  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: kakaoRedirectUri(),
    response_type: 'code',
    state,
  })
  return { kind: 'external', url: `${AUTHORIZE_URL}?${params}` }
}

/** 콜백의 state 를 확인하고 저장해 둔 값을 지운다(1회용). 맞지 않으면 null */
export function consumeKakaoState(state: string | null): Pending | null {
  let pending: Pending | null = null
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY)
    pending = raw ? (JSON.parse(raw) as Pending) : null
  } catch {
    return null
  }
  if (!pending || !state || pending.state !== state) return null
  return { state: pending.state, returnTo: safeReturnTo(pending.returnTo) }
}
