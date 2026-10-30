import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { auth } from '../../lib/auth'
import { db } from '../../mocks/db'
import { renderRoute, signInAsOwner } from '../../test/render'

describe('사장님 로그인 (Spec REQ-P10)', () => {
  it('로그인하지 않으면 로그인 화면으로 보낸다', async () => {
    const { router } = renderRoute('/owner')
    expect(await screen.findByRole('heading', { name: '웨이핏 사장님' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/owner/login')
  })

  it('카카오 로그인하면 대시보드로', async () => {
    const { user, router } = renderRoute('/owner/login')
    await user.click(screen.getByRole('button', { name: '카카오 로그인' }))

    expect(await screen.findByRole('heading', { name: '광교 모퉁이커피' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/owner')
    expect(auth.token()).toMatch(/^wfs_/)
  })

  it('로그아웃하면 로그인 화면으로', async () => {
    await signInAsOwner()
    const { user, router } = renderRoute('/owner')
    await screen.findByRole('heading', { name: '광교 모퉁이커피' })

    await user.click(screen.getByRole('button', { name: '로그아웃' }))
    expect(await screen.findByRole('heading', { name: '웨이핏 사장님' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/owner/login')
    expect(auth.isSignedIn()).toBe(false)
  })
})

describe('대시보드 (Spec REQ-P13)', () => {
  it('최근 7일 지표와 전환율을 보여주고 30일로 바꿀 수 있다', async () => {
    await signInAsOwner()
    const { user } = renderRoute('/owner')

    expect(await screen.findByText('인증된 방문')).toBeInTheDocument()
    expect(screen.getByText('노출 → 실제 방문')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '최근 7일' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: '최근 30일' }))
    expect(screen.getByRole('tab', { name: '최근 30일' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('매장 정보 (Spec REQ-P11, P12)', () => {
  it('혜택 문구를 바꾸면 미리보기에 바로 보이고, 저장하면 서버에 반영된다', async () => {
    await signInAsOwner()
    const { user } = renderRoute('/owner/store')

    const benefit = await screen.findByLabelText(/혜택 문구/)
    await user.clear(benefit)
    await user.type(benefit, '라떼 사이즈 업')
    // 미리보기(차량 화면 카드)에 그대로
    expect(screen.getAllByText('라떼 사이즈 업').length).toBeGreaterThan(0)
    expect(screen.getByText('혜택 문구 (8/40)')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '300m' }))
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByText('저장했어요. 다음 추천부터 반영돼요')).toBeInTheDocument()
    expect(db.stores[0]).toMatchObject({ benefitText: '라떼 사이즈 업', radiusM: 300 })
  })

  it('PIN 은 숫자 4자리만 입력된다', async () => {
    await signInAsOwner()
    const { user } = renderRoute('/owner/store')

    const pin = await screen.findByLabelText(/PIN 변경/)
    await user.type(pin, '12ab345')
    expect(pin).toHaveValue('1234')
  })
})
