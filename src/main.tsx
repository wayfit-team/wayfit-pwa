import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { ApiError } from './api/errors'
import './index.css'
import { createRouter } from './router'

const DAY = 24 * 60 * 60 * 1000

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 오프라인에서도 마지막 쿠폰을 보여주려면 캐시를 하루 동안 보관 (Spec REQ-P6)
      gcTime: DAY,
      staleTime: 30_000,
      // 4xx 는 다시 시도해도 같은 결과
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
})

const persister = createSyncStoragePersister({ storage: window.localStorage, key: 'wf.queryCache' })

async function bootstrap() {
  // 백엔드 연동 전: 개발 서버와 VITE_USE_MOCK=true 빌드(시연용)는 MSW 목 API 를 쓴다.
  // 목 모드에서는 MSW 서비스 워커와 PWA 서비스 워커가 같은 범위를 두고 충돌하므로 PWA 등록을 건너뛴다.
  const useMock = import.meta.env.DEV || import.meta.env.VITE_USE_MOCK === 'true'
  if (useMock) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass', quiet: true })
  } else {
    const { registerSW } = await import('virtual:pwa-register')
    registerSW({ immediate: true })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: DAY }}>
        <RouterProvider router={createRouter()} />
      </PersistQueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
