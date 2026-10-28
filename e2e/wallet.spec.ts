import { expect, test, type Page } from '@playwright/test'

const PHONE = { width: 390, height: 844 }
const DESKTOP = { width: 1280, height: 860 }

/** SCREENSHOTS=1 일 때만 docs/screenshots 에 저장 (PR·문서용) */
async function snap(page: Page, name: string) {
  if (process.env.SCREENSHOTS) await page.screenshot({ path: `docs/screenshots/${name}.png` })
}

// 목 DB 는 페이지를 새로 불러오면 초기화된다 → 한 시나리오 안에서는 앱 안에서 눌러서 이동한다

test.describe('운전자 쿠폰 지갑 (폰)', () => {
  test.use({ viewport: PHONE, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

  test('차 QR → 쿠폰함 → 계산대에서 PIN 사용 처리', async ({ page }) => {
    await page.goto('/pair?code=12345678')
    await expect(page.getByText('차와 연결됐어요. 쿠폰을 매장에서 보여주세요')).toBeVisible()
    await expect(page.getByText('아메리카노 1잔 무료')).toBeVisible()
    await snap(page, 'pwa-01-coupons')

    await page.getByText('아메리카노 1잔 무료').click()
    await expect(page.getByText('303 184')).toBeVisible()
    await snap(page, 'pwa-02-detail')

    await page.getByRole('button', { name: '직원 확인' }).click()
    const sheet = page.getByRole('dialog', { name: '직원 확인' })
    for (const d of '0000') await sheet.getByRole('button', { name: d, exact: true }).click()
    await expect(sheet.getByText('PIN이 맞지 않아요 · 4번 남았어요')).toBeVisible()
    await snap(page, 'pwa-03-pin-wrong')

    for (const d of '1234') await sheet.getByRole('button', { name: d, exact: true }).click()
    await expect(page.getByRole('dialog', { name: '사용 완료' })).toBeVisible()
    await snap(page, 'pwa-04-redeemed')

    await page.getByRole('button', { name: '쿠폰함으로' }).click()
    await page.getByRole('tab', { name: /사용 완료/ }).click()
    await expect(page.getByText('아메리카노 1잔 무료')).toBeVisible()
  })

  test('연결된 차 관리', async ({ page }) => {
    await page.goto('/pair?code=12345678')
    await page.getByRole('link', { name: '설정' }).click()
    await expect(page.getByText('아이오닉 5 · Pleos')).toBeVisible()
    await snap(page, 'pwa-05-settings')
  })

  test('만료된 QR 은 이유와 직접 입력을 보여준다', async ({ page }) => {
    await page.goto('/pair?code=00000000')
    await expect(page.getByRole('alert')).toContainText('연결 코드가 만료됐어요')
    await snap(page, 'pwa-06-pair-expired')
  })

  test('연결된 차가 없으면 안내', async ({ page }) => {
    await page.goto('/coupons')
    await expect(page.getByText('연결된 차가 없어요')).toBeVisible()
  })
})

test.describe('사장님 웹 (데스크톱)', () => {
  test.use({ viewport: DESKTOP })

  test('로그인 → 대시보드 → 매장 정보 미리보기', async ({ page }) => {
    await page.goto('/owner')
    await expect(page).toHaveURL(/\/owner\/login$/)
    await page.getByLabel('이메일').fill('owner@wayfit.app')
    await page.getByLabel('비밀번호').fill('wayfit1234')
    await snap(page, 'pwa-07-owner-login')
    await page.getByRole('button', { name: '로그인' }).click()

    await expect(page.getByRole('heading', { name: '광교 모퉁이커피' })).toBeVisible()
    await expect(page.getByText('인증된 방문', { exact: true })).toBeVisible()
    await snap(page, 'pwa-08-owner-dashboard')

    await page.getByRole('link', { name: '매장 정보' }).click()
    const benefit = page.getByLabel(/혜택 문구/)
    await benefit.fill('라떼 사이즈 업')
    await expect(page.getByText('라떼 사이즈 업').first()).toBeVisible()
    await page.getByRole('button', { name: '저장' }).click()
    await expect(page.getByText('저장했어요. 다음 추천부터 반영돼요')).toBeVisible()
    await snap(page, 'pwa-09-owner-store')
  })
})
