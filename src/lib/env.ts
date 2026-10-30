/**
 * 개발 서버와 VITE_USE_MOCK=true 빌드(시연용)는 MSW 목 API 를 쓴다.
 * 목 모드에서는 카카오 로그인도 실제 카카오로 나가지 않고 콜백으로 바로 돌아온다
 */
export const useMock = import.meta.env.DEV || import.meta.env.VITE_USE_MOCK === 'true'
