import { CheckCircle2 } from 'lucide-react'
import type { Coupon } from '../../api/types'
import { formatDateTime } from '../../lib/coupon'
import { Button } from '../../ui/Button'

/** 직원이 한눈에 확인하는 전체 화면 (Spec REQ-P5) */
export function RedeemDone({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  return (
    <div role="dialog" aria-label="사용 완료" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-brand px-6 text-on-brand">
      <CheckCircle2 size={96} strokeWidth={2.5} />
      <div className="text-center">
        <p className="text-4xl font-black">사용 완료</p>
        <p className="mt-3 text-xl font-bold">{coupon.benefit}</p>
        <p className="mt-1 text-lg">{coupon.storeName}</p>
        {coupon.redeemedAt && <p className="mt-4 text-base opacity-80">{formatDateTime(coupon.redeemedAt)}</p>}
      </div>
      <Button variant="secondary" size="lg" className="mt-4 min-w-48" onClick={onClose}>
        쿠폰함으로
      </Button>
    </div>
  )
}
