/**
 * 카카오 로그인 세션 토큰 저장. 운전자 쿠폰 지갑과 사장님 웹이 같은 카카오 로그인을 쓴다.
 * API가 다른 사이트(Workers)라 쿠키 대신 Bearer + localStorage.
 * 세션을 잃어도 쿠폰은 차량 기기에 있으므로 다시 로그인하면 그대로 보인다 (Spec EDGE-P1)
 */
const SESSION_KEY = 'wf.session'
export const QUERY_CACHE_KEY = 'wf.queryCache'
/** 세션이 지워졌을 때 메모리의 쿼리 캐시도 비우도록 main.tsx 가 듣는다 */
export const SESSION_CLEARED_EVENT = 'wf:session-cleared'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // 사생활 보호 모드 등 저장소를 쓸 수 없으면 이번 세션만 동작
  }
}

export const auth = {
  token: () => read(SESSION_KEY),
  isSignedIn: () => read(SESSION_KEY) !== null,
  setToken: (token: string) => write(SESSION_KEY, token),
  /** 로그아웃·세션 만료. 공용 폰에서 다음 사람에게 이전 사용자의 쿠폰이 보이지 않도록 캐시도 함께 지운다 */
  clear: () => {
    write(SESSION_KEY, null)
    write(QUERY_CACHE_KEY, null)
    window.dispatchEvent(new Event(SESSION_CLEARED_EVENT))
  },
}
