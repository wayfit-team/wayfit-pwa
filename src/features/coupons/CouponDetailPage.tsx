import { ArrowLeft, BadgeCheck, Clock } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useCoupons } from '../../api/queries'
import type { Coupon } from '../../api/types'
import { daysLeftLabel, effectiveStatus, formatCode, formatDateTime } from '../../lib/coupon'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Dialog'
import { OfflineBanner } from '../../ui/OfflineBanner'
import { Badge, Page, Skeleton } from '../../ui/Surfaces'
import { PinPad } from './PinPad'
import { RedeemDone } from './RedeemDone'

/** 계산대에서 직원에게 보여주는 화면: 혜택을 크게, 코드는 또렷하게 (Spec REQ-P4, NFR-P4) */
export function CouponDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const coupons = useCoupons()
  const [pinOpen, setPinOpen] = useState(false)
  const [done, setDone] = useState<Coupon | null>(null)

  const back = (
    <Link to="/coupons" aria-label="쿠폰함" className="rounded-btn p-2 text-ink-2 hover:bg-sunken">
      <ArrowLeft size={24} />
    </Link>
  )

  if (coupons.isPending) {
    return (
      <Page right={back}>
        <Skeleton className="h-96" />
      </Page>
    )
  }
  const coupon = coupons.data?.find((c) => c.id === id)
  if (!coupon) return <Navigate to="/coupons" replace />

  const status = effectiveStatus(coupon)

  return (
    <Page right={back}>
      <OfflineBanner />
      <div className="flex flex-1 flex-col gap-5">
        <div className="relative overflow-hidden rounded-card border border-line bg-surface p-6 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-2 bg-brand" />
          <p className="text-lg font-semibold text-ink-2">{coupon.storeName}</p>
          <p className="mt-2 text-[34px] font-black leading-tight">{coupon.benefit}</p>

          <div className="mt-6 rounded-btn bg-sunken p-4 text-center">
            <p className="text-sm font-semibold text-ink-3">쿠폰 코드</p>
            <p className="mt-1 font-mono text-5xl font-bold tracking-wider text-ink">{formatCode(coupon.code6)}</p>
          </div>

          <div className="mt-5 flex items-center justify-between">
            {status === 'ISSUED' && (
              <Badge tone={daysLeftLabel(coupon.expiresAt) === '오늘까지' ? 'rose' : 'brand'}>
                <Clock size={14} /> {daysLeftLabel(coupon.expiresAt)}
              </Badge>
            )}
            {status === 'REDEEMED' && (
              <Badge tone="neutral">
                <BadgeCheck size={14} /> {coupon.redeemedAt ? `${formatDateTime(coupon.redeemedAt)} 사용` : '사용 완료'}
              </Badge>
            )}
            {status === 'EXPIRED' && <Badge tone="rose">기간 만료</Badge>}
            <span className="text-sm text-ink-3">{formatDateTime(coupon.expiresAt)}까지</span>
          </div>
        </div>

        {status === 'ISSUED' ? (
          <>
            <p className="text-center text-ink-2">이 화면을 직원에게 보여주세요</p>
            <Button size="lg" block onClick={() => setPinOpen(true)} className="mt-auto">
              직원 확인
            </Button>
          </>
        ) : (
          <p className="text-center text-ink-2">
            {status === 'REDEEMED' ? '이미 사용한 쿠폰이에요' : '사용 기간이 지난 쿠폰이에요'}
          </p>
        )}
      </div>

      <Sheet open={pinOpen} onClose={() => setPinOpen(false)} label="직원 확인">
        <PinPad
          coupon={coupon}
          onClose={() => setPinOpen(false)}
          onDone={(redeemed) => {
            setPinOpen(false)
            setDone(redeemed)
          }}
        />
      </Sheet>
      {done && <RedeemDone coupon={done} onClose={() => navigate('/coupons', { replace: true })} />}
    </Page>
  )
}
