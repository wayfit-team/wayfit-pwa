import { Delete, Lock, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ApiError, errorMessage } from '../../api/errors'
import { useRedeem } from '../../api/queries'
import type { Coupon } from '../../api/types'
import { useOnline } from '../../lib/online'
import { Button } from '../../ui/Button'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

/**
 * 직원이 매장 PIN 4자리를 눌러 사용 처리 (Spec REQ-P5).
 * 4자리를 다 누르면 바로 보낸다. 틀리면 남은 횟수, 잠기면 남은 시간을 보여준다.
 */
export function PinPad({ coupon, onDone, onClose }: { coupon: Coupon; onDone: (c: Coupon) => void; onClose: () => void }) {
  const online = useOnline()
  const redeem = useRedeem(coupon.id)
  const [pin, setPin] = useState('')
  const [lockedSec, setLockedSec] = useState(0)

  const error = redeem.error
  const code = error instanceof ApiError ? error.code : null
  const remaining = code === 'PIN_INVALID' ? Number(error instanceof ApiError ? error.details.remainingAttempts : 0) : null
  const final = code === 'COUPON_ALREADY_REDEEMED' || code === 'COUPON_EXPIRED' || code === 'STORE_INACTIVE'

  useEffect(() => {
    if (lockedSec <= 0) return
    const t = setTimeout(() => setLockedSec((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [lockedSec])

  const disabled = !online || redeem.isPending || lockedSec > 0 || final

  const press = (key: (typeof KEYS)[number]) => {
    if (disabled || key === '') return
    if (key === 'del') return setPin((p) => p.slice(0, -1))
    const next = (pin + key).slice(0, 4)
    setPin(next)
    if (next.length === 4) {
      redeem.mutate(next, {
        onSuccess: onDone,
        onError: (e) => {
          if (e instanceof ApiError && e.code === 'PIN_LOCKED') setLockedSec(Number(e.details.retryAfterSec ?? 0))
        },
        onSettled: () => setPin(''),
      })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-sm font-semibold text-brand-strong">직원 확인</p>
        <h2 className="mt-1 text-xl font-extrabold">매장 PIN 4자리를 눌러주세요</h2>
        <p className="mt-1 text-sm text-ink-2">{coupon.benefit}</p>
      </div>

      <div className="flex justify-center gap-3" aria-label={`입력한 자리 ${pin.length}개`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`size-5 rounded-full border-2 ${i < pin.length ? 'border-brand bg-brand' : 'border-line bg-surface'}`}
          />
        ))}
      </div>

      <div role="alert" className="min-h-6 text-center text-sm font-semibold">
        {!online ? (
          <span className="inline-flex items-center gap-1 text-amber">
            <WifiOff size={16} /> 인터넷이 연결되면 사용 처리할 수 있어요
          </span>
        ) : lockedSec > 0 ? (
          <span className="inline-flex items-center gap-1 text-rose">
            <Lock size={16} /> PIN을 여러 번 틀렸어요 · {Math.floor(lockedSec / 60)}:{String(lockedSec % 60).padStart(2, '0')} 후 다시
          </span>
        ) : remaining !== null ? (
          <span className="text-rose">PIN이 맞지 않아요 · {remaining}번 남았어요</span>
        ) : error && code !== 'PIN_LOCKED' ? (
          <span className="text-rose">{errorMessage(error)}</span>
        ) : redeem.isPending ? (
          <span className="text-ink-2">확인하고 있어요…</span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => press(key)}
              aria-label={key === 'del' ? '지우기' : key}
              className="flex h-16 items-center justify-center rounded-btn bg-sunken text-2xl font-bold transition active:scale-95 active:bg-line disabled:opacity-40"
            >
              {key === 'del' ? <Delete size={24} /> : key}
            </button>
          ),
        )}
      </div>

      <Button variant="ghost" block onClick={onClose}>
        {final ? '닫기' : '취소'}
      </Button>
    </div>
  )
}
