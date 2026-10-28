import { CarFront, Settings, Ticket as TicketIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useCoupons } from '../../api/queries'
import { auth } from '../../lib/auth'
import { groupCoupons, type CouponTab } from '../../lib/coupon'
import { OfflineBanner } from '../../ui/OfflineBanner'
import { EmptyState, Page, Skeleton } from '../../ui/Surfaces'
import { Ticket } from '../../ui/Ticket'
import { InstallPrompt } from '../install/InstallPrompt'

const TABS: { key: CouponTab; label: string; empty: string }[] = [
  { key: 'active', label: '사용 가능', empty: '아직 쿠폰이 없어요. 가는 길에 웨이핏 매장에 들러보세요' },
  { key: 'used', label: '사용 완료', empty: '사용한 쿠폰이 여기 모여요' },
  { key: 'expired', label: '만료', empty: '만료된 쿠폰이 없어요' },
]

export function CouponListPage() {
  const location = useLocation()
  const justPaired = (location.state as { justPaired?: boolean } | null)?.justPaired === true
  const [tab, setTab] = useState<CouponTab>('active')
  const coupons = useCoupons()

  const settingsLink = (
    <Link to="/settings" aria-label="설정" className="rounded-btn p-2 text-ink-2 hover:bg-sunken">
      <Settings size={24} />
    </Link>
  )

  // 연결된 차가 없음 (Spec REQ-P9, EDGE-P1)
  if (auth.userToken() === null) {
    return (
      <Page right={settingsLink}>
        <EmptyState
          icon={<CarFront size={32} />}
          title="연결된 차가 없어요"
          body="차 화면에서 웨이핏 → 설정 → 연결된 폰에서 QR을 찍어주세요. 받은 쿠폰은 차에 남아 있어요"
          action={
            <Link to="/pair" className="font-bold text-brand-strong underline underline-offset-4">
              코드 직접 입력하기
            </Link>
          }
        />
      </Page>
    )
  }

  const groups = groupCoupons(coupons.data ?? [])

  return (
    <Page right={settingsLink}>
      <OfflineBanner />
      {justPaired && (
        <p role="status" className="mb-3 rounded-btn bg-brand-soft px-4 py-3 font-semibold text-brand-strong">
          차와 연결됐어요. 쿠폰을 매장에서 보여주세요
        </p>
      )}
      <InstallPrompt visible={justPaired} />

      <h1 className="mb-3 text-2xl font-extrabold">쿠폰함</h1>
      <div role="tablist" className="mb-4 grid grid-cols-3 gap-1 rounded-btn bg-sunken p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`h-11 rounded-sm text-sm font-bold transition ${tab === t.key ? 'bg-surface text-ink shadow-sm' : 'text-ink-3'}`}
          >
            {t.label} {groups[t.key].length > 0 && <span className="text-brand-strong">{groups[t.key].length}</span>}
          </button>
        ))}
      </div>

      {coupons.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : groups[tab].length === 0 ? (
        <EmptyState icon={<TicketIcon size={32} />} title={TABS.find((t) => t.key === tab)!.empty} />
      ) : (
        <ul className="flex flex-col gap-3">
          {groups[tab].map((c) => (
            <li key={c.id}>
              <Link to={`/coupons/${c.id}`} className="block transition active:scale-[0.99]">
                <Ticket coupon={c} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  )
}
