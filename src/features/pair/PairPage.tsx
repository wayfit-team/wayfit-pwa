import { CarFront, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useClaimPairing } from '../../api/queries'
import { Button } from '../../ui/Button'
import { Card, Page } from '../../ui/Surfaces'

/**
 * 차 화면 QR → /pair?code=XXXXXXXX → 자동 연결 → 쿠폰함 (Spec REQ-P1)
 * QR 없이 8자리 코드 직접 입력도 된다 (REQ-P2)
 */
export function PairPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const claim = useClaimPairing()
  const [code, setCode] = useState('')
  const autoTried = useRef(false)

  const submit = (value: string) =>
    claim.mutate(value, { onSuccess: () => navigate('/coupons', { replace: true, state: { justPaired: true } }) })

  // QR 로 들어오면 한 번만 자동 연결
  useEffect(() => {
    const fromQr = params.get('code')
    if (fromQr && !autoTried.current) {
      autoTried.current = true
      setCode(fromQr)
      submit(fromQr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (code.length === 8) submit(code)
  }

  if (claim.isPending) {
    return (
      <Page>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="animate-spin text-brand-strong" size={48} />
          <p className="text-xl font-bold">차와 연결하고 있어요</p>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <div className="flex flex-1 flex-col justify-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-card bg-brand-soft text-brand-strong">
            <CarFront size={32} />
          </div>
          <h1 className="text-2xl font-extrabold">차와 연결하기</h1>
          <p className="text-ink-2">
            차 화면의 <b>설정 → 연결된 폰</b>에서 QR을 찍거나
            <br />
            아래에 8자리 코드를 입력해 주세요
          </p>
        </div>

        {claim.isError && (
          <p role="alert" className="rounded-btn bg-rose-soft px-4 py-3 text-center font-semibold text-rose">
            {errorMessage(claim.error)}
          </p>
        )}

        <Card>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label htmlFor="pair-code" className="text-sm font-semibold text-ink-2">
              연결 코드
            </label>
            <input
              id="pair-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="12345678"
              className="h-16 rounded-btn border border-line bg-sunken text-center font-mono text-3xl tracking-[0.3em] outline-none focus:border-brand focus:ring-2 focus:ring-brand"
            />
            <Button type="submit" size="lg" block disabled={code.length !== 8}>
              연결하기
            </Button>
          </form>
        </Card>
        <p className="text-center text-sm text-ink-3">앱 설치·회원가입 없이 바로 쿠폰함이 열려요</p>
      </div>
    </Page>
  )
}
