import { defineConfig, devices } from '@playwright/test'

/** E2E: 개발 서버(MSW 목 API)를 띄워 실제 브라우저로 흐름 확인. SCREENSHOTS=1 이면 docs/screenshots 에 캡처 저장 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
