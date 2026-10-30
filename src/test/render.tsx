import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { api } from '../api/client'
import { auth } from '../lib/auth'
import { kakaoRedirectUri } from '../lib/kakao'
import { DEMO } from '../mocks/db'
import { routes } from '../router'

/** 실제 라우트 표를 메모리 라우터로 띄운다. API 는 MSW(src/mocks/handlers.ts)가 받는다 */
export function renderRoute(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, client, user }
}

/** 카카오 로그인된 상태로 만든다. 목 계정은 차가 연결된 운전자이자 매장 s1 의 사장님 */
export async function signIn() {
  const { sessionToken } = await api.kakaoLogin(DEMO.kakaoCode, kakaoRedirectUri())
  auth.setToken(sessionToken)
}

export const signInAsDriver = signIn
export const signInAsOwner = signIn
