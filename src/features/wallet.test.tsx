import { act, screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { auth } from '../lib/auth'
import { DEMO, db } from '../mocks/db'
import { server } from '../mocks/node'
import { renderRoute, signIn, signInAsDriver } from '../test/render'

describe('카카오 로그인 (콜백)', () => {
  it('state 가 맞지 않으면 로그인하지 않는다 (로그인 CSRF 방지)', async () => {
    renderRoute(`/auth/kakao/callback?code=${DEMO.kakaoCode}&state=forged`)
    expect(await screen.findByRole('alert')).toHaveTextContent('로그인 요청을 확인하지 못했어요')
    expect(auth.isSignedIn()).toBe(false)
  })

  it('카카오에서 취소하면 취소했다고 알린다', async () => {
    renderRoute('/auth/kakao/callback?error=access_denied&state=x')
    expect(await screen.findByRole('alert')).toHaveTextContent('카카오 로그인을 취소했어요')
    expect(auth.isSignedIn()).toBe(false)
  })
})

describe('차량 QR 로 연결 (Spec REQ-P1, P2)', () => {
  it('로그인 전에 QR 로 들어오면 카카오 로그인 후 같은 코드로 자동 연결해 쿠폰함으로 간다', async () => {
    const { user, router } = renderRoute(`/pair?code=${DEMO.validCode}`)

    await user.click(screen.getByRole('button', { name: '카카오로 로그인하고 연결' }))

    expect(await screen.findByText('차와 연결됐어요. 쿠폰을 매장에서 보여주세요')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/coupons')
    expect(auth.token()).toMatch(/^wfs_/)
    expect(await screen.findByText('아메리카노 1잔 무료')).toBeInTheDocument()

    // 뒤로 가기를 눌러도 /pair?code= 가 방문 기록에 남아 재연결을 시도하지 않는다
    await act(() => router.navigate(-1))
    expect(router.state.location.pathname).toBe('/coupons')
  })

  it('로그인된 상태로 QR 링크에 들어오면 바로 연결한다', async () => {
    await signIn()
    const { router } = renderRoute(`/pair?code=${DEMO.validCode}`)
    expect(await screen.findByText('차와 연결됐어요. 쿠폰을 매장에서 보여주세요')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/coupons')
  })

  it('만료된 QR 이면 이유를 알리고 코드를 직접 넣게 한다', async () => {
    await signIn()
    const { user, router } = renderRoute(`/pair?code=${DEMO.expiredCode}`)

    expect(await screen.findByRole('alert')).toHaveTextContent('연결 코드가 만료됐어요')
    const input = screen.getByLabelText('연결 코드')
    await user.clear(input)
    await user.type(input, `abc${DEMO.validCode}99`) // 숫자만, 8자리까지만
    expect(input).toHaveValue(DEMO.validCode)
    await user.click(screen.getByRole('button', { name: '연결하기' }))

    expect(await screen.findByText('쿠폰함')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/coupons')
  })
})

describe('쿠폰함 (Spec REQ-P3, P9)', () => {
  it('로그인 전에는 카카오 로그인을 보여준다', () => {
    renderRoute('/coupons')
    expect(screen.getByText('카카오로 로그인하고 쿠폰함을 열어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '카카오 로그인' })).toBeInTheDocument()
  })

  it('서버에서 세션이 폐기됐으면(401) 로그인 안내로 돌아간다', async () => {
    auth.setToken('wfs_revoked')
    renderRoute('/coupons')
    expect(await screen.findByText('카카오로 로그인하고 쿠폰함을 열어요')).toBeInTheDocument()
    expect(auth.isSignedIn()).toBe(false)
  })

  it('다른 탭에서 로그아웃하거나 세션이 바뀌면(storage 이벤트) 이 탭의 쿼리 캐시도 비운다', async () => {
    await signInAsDriver()
    const { client } = renderRoute('/coupons')
    expect(await screen.findByText('아메리카노 1잔 무료')).toBeInTheDocument()
    expect(client.getQueryData(['coupons'])).toBeDefined()

    act(() => {
      localStorage.removeItem('wf.session')
      window.dispatchEvent(new StorageEvent('storage', { key: 'wf.session', oldValue: 'wfs_1', newValue: null }))
    })

    expect(await screen.findByText('카카오로 로그인하고 쿠폰함을 열어요')).toBeInTheDocument()
    expect(client.getQueryData(['coupons'])).toBeUndefined()
  })

  it('로그인했지만 연결된 차가 없으면 연결 안내를 보여준다', async () => {
    db.devices = []
    await signIn()
    renderRoute('/coupons')
    expect(await screen.findByText('연결된 차가 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '코드 직접 입력하기' })).toHaveAttribute('href', '/pair')
  })

  it('사용 가능 / 사용 완료 / 만료 탭으로 나눠 보여준다', async () => {
    await signInAsDriver()
    const { user } = renderRoute('/coupons')

    await screen.findByText('음료 사이즈 업') // 목록 도착 후 탭 숫자 확인
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['사용 가능 2', '사용 완료 1', '만료 1'])
    // 사용 가능은 만료 임박 순: 브루잉랩(12시간) → 모퉁이커피(7일)
    const items = await screen.findAllByRole('listitem')
    expect(within(items[0]).getByText('음료 사이즈 업')).toBeInTheDocument()
    expect(within(items[0]).getByText('오늘까지')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /사용 완료/ }))
    expect(await screen.findByText('튀김 1인분 서비스')).toBeInTheDocument()
  })
})

describe('계산대에서 사용 처리 (Spec REQ-P4, P5)', () => {
  it('로그아웃 상태로 쿠폰 상세를 열면 로그인 안내를 보여주고, 로그인하면 그 쿠폰을 바로 보여준다', async () => {
    const { user, router } = renderRoute('/coupons/c-coffee')
    expect(screen.getByText('카카오로 로그인하고 쿠폰을 확인해요')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '카카오 로그인' }))
    expect(await screen.findByText('303 184')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/coupons/c-coffee')
  })

  it('직원이 PIN 을 틀리면 남은 횟수, 맞으면 사용 완료 화면', async () => {
    await signInAsDriver()
    const { user } = renderRoute('/coupons/c-coffee')

    expect(await screen.findByText('303 184')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '직원 확인' }))

    const dialog = await screen.findByRole('dialog', { name: '직원 확인' })
    for (const d of '0000') await user.click(within(dialog).getByRole('button', { name: d }))
    expect(await within(dialog).findByText('PIN이 맞지 않아요 · 4번 남았어요')).toBeInTheDocument()

    for (const d of DEMO.storePin) await user.click(within(dialog).getByRole('button', { name: d }))
    const done = await screen.findByRole('dialog', { name: '사용 완료' })
    expect(within(done).getByText('아메리카노 1잔 무료')).toBeInTheDocument()
  })

  it('이미 사용한 쿠폰은 직원 확인 버튼이 없다', async () => {
    await signInAsDriver()
    renderRoute('/coupons/c-tteok')

    expect(await screen.findByText('이미 사용한 쿠폰이에요')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '직원 확인' })).not.toBeInTheDocument()
  })
})

describe('연결된 차 관리 (Spec REQ-P8)', () => {
  it('확인창을 거쳐 연결을 해제한다', async () => {
    await signInAsDriver()
    const { user } = renderRoute('/settings')

    await user.click(await screen.findByRole('button', { name: '해제' }))
    const dialog = screen.getByRole('dialog', { name: '연결 해제' })
    expect(within(dialog).getByText('아이오닉 5 · Pleos 연결을 해제할까요?')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '연결 해제' }))

    expect(await screen.findByText('연결된 차가 없어요')).toBeInTheDocument()
  })

  it('서버가 차 이름 없이 긴 기기 ID 만 주면 끝 4자리로 짧게 부른다', async () => {
    await signInAsDriver()
    server.use(
      http.get('*/v1/me/devices', () =>
        HttpResponse.json({ devices: [{ deviceId: 'dev_559b9a0cdfbb421a8b8cd20116dd8430', linkedAt: '2026-11-07T10:00:00Z' }] }),
      ),
    )
    const { user } = renderRoute('/settings')

    expect(await screen.findByText('차량 · 8430')).toBeInTheDocument()
    expect(screen.queryByText(/dev_559b/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '해제' }))
    expect(within(screen.getByRole('dialog', { name: '연결 해제' })).getByText('차량 · 8430 연결을 해제할까요?')).toBeInTheDocument()
  })

  it('로그아웃하면 세션을 폐기하고 로그인 화면으로 돌아간다', async () => {
    await signIn()
    const token = auth.token()!
    const { user, router } = renderRoute('/settings')

    await user.click(await screen.findByRole('button', { name: '로그아웃' }))

    expect(await screen.findByText('카카오로 로그인하고 쿠폰함을 열어요')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/coupons')
    expect(auth.isSignedIn()).toBe(false)
    expect(db.sessions.has(token)).toBe(false)
  })
})
