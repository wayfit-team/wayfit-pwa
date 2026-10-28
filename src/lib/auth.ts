/**
 * 토큰 저장. API가 다른 도메인(Workers)이라 쿠키 대신 Bearer + localStorage.
 * 운전자 토큰을 잃어도 쿠폰은 차량 기기에 있으므로 다시 연결하면 그대로 보인다 (Spec EDGE-P1)
 */
const USER_KEY = 'wf.userToken'
const OWNER_KEY = 'wf.ownerToken'

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
  userToken: () => read(USER_KEY),
  setUserToken: (token: string | null) => write(USER_KEY, token),
  ownerToken: () => read(OWNER_KEY),
  setOwnerToken: (token: string | null) => write(OWNER_KEY, token),
}
