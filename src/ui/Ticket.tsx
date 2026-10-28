import type { Coupon } from '../api/types'
import { daysLeftLabel, effectiveStatus, formatCode, formatDateTime } from '../lib/coupon'

/** 쿠폰 티켓: 왼쪽 혜택, 점선, 오른쪽 코드 스텁. 차량 앱 TicketCard 와 같은 모양 */
export function Ticket({ coupon }: { coupon: Coupon }) {
  const status = effectiveStatus(coupon)
  const active = status === 'ISSUED'
  const urgent = active && daysLeftLabel(coupon.expiresAt) === '오늘까지'
  return (
    <div
      className={`relative flex overflow-hidden rounded-card border bg-surface shadow-sm ${active ? 'border-line' : 'border-line opacity-60'}`}
    >
      <div className="min-w-0 flex-1 p-5">
        <p className="truncate text-sm text-ink-2">{coupon.storeName}</p>
        <p className="mt-1 text-xl font-extrabold leading-snug">{coupon.benefit}</p>
        <p className={`mt-2 text-sm font-semibold ${urgent ? 'text-rose' : 'text-ink-3'}`}>
          {status === 'REDEEMED' && coupon.redeemedAt
            ? `${formatDateTime(coupon.redeemedAt)} 사용`
            : status === 'EXPIRED'
              ? '기간 만료'
              : daysLeftLabel(coupon.expiresAt)}
        </p>
      </div>
      <div className="relative flex w-28 shrink-0 flex-col items-center justify-center border-l-2 border-dashed border-line bg-sunken/50">
        {/* 위·아래 반원 홈 */}
        <span className="absolute -top-3 -left-3 size-6 rounded-full bg-bg" />
        <span className="absolute -bottom-3 -left-3 size-6 rounded-full bg-bg" />
        <span className="text-xs text-ink-3">코드</span>
        <span className={`font-mono text-lg font-bold ${active ? 'text-brand-strong' : 'text-ink-3'}`}>
          {formatCode(coupon.code6)}
        </span>
      </div>
    </div>
  )
}
