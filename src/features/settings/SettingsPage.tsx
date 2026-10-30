import { ArrowLeft, CarFront, Link2Off, LogOut, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useDevices, useSignOut, useUnlinkDevice } from '../../api/queries'
import type { LinkedDevice } from '../../api/types'
import { auth } from '../../lib/auth'
import { formatDateTime } from '../../lib/coupon'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Dialog'
import { Card, EmptyState, Page, Skeleton } from '../../ui/Surfaces'
import { KakaoLoginButton } from '../auth/KakaoLoginButton'

/** 연결된 차 목록·연결 해제 (Spec REQ-P8) */
export function SettingsPage() {
  const navigate = useNavigate()
  const devices = useDevices()
  const unlink = useUnlinkDevice()
  const signOut = useSignOut()
  const [target, setTarget] = useState<LinkedDevice | null>(null)

  const back = (
    <Link to="/coupons" aria-label="쿠폰함" className="rounded-btn p-2 text-ink-2 hover:bg-sunken">
      <ArrowLeft size={24} />
    </Link>
  )

  return (
    <Page title="설정" right={back}>
      <h1 className="mb-1 text-2xl font-extrabold">연결된 차</h1>
      <p className="mb-4 text-ink-2">쿠폰은 연결된 차에 쌓이고, 이 폰에서 보여줄 수 있어요</p>

      {!auth.isSignedIn() ? (
        <EmptyState
          icon={<CarFront size={32} />}
          title="로그인하면 연결된 차를 볼 수 있어요"
          action={
            <div className="w-full max-w-xs">
              <KakaoLoginButton returnTo="/settings" />
            </div>
          }
        />
      ) : devices.data && devices.data.length === 0 ? (
        <EmptyState icon={<CarFront size={32} />} title="연결된 차가 없어요" />
      ) : devices.isPending ? (
        <Skeleton className="h-24" />
      ) : (
        <ul className="flex flex-col gap-3">
          {devices.data?.map((d) => (
            <li key={d.id}>
              <Card className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-sm bg-brand-soft text-brand-strong">
                  <CarFront size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{d.label}</p>
                  <p className="text-sm text-ink-3">연결 {formatDateTime(d.linkedAt)}</p>
                </div>
                <Button variant="secondary" icon={<Link2Off size={18} />} onClick={() => setTarget(d)}>
                  해제
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {auth.isSignedIn() && (
        <>
          <Button variant="secondary" block icon={<Plus size={18} />} className="mt-4" onClick={() => navigate('/pair')}>
            다른 차 연결
          </Button>
          <Button
            variant="ghost"
            block
            icon={<LogOut size={18} />}
            className="mt-2"
            onClick={() => void signOut().then(() => navigate('/coupons', { replace: true }))}
          >
            로그아웃
          </Button>
        </>
      )}

      <Sheet open={target !== null} onClose={() => setTarget(null)} label="연결 해제">
        <h2 className="text-xl font-extrabold">{target?.label} 연결을 해제할까요?</h2>
        <p className="mt-2 text-ink-2">해제하면 이 차의 쿠폰이 이 폰에 보이지 않아요. 쿠폰은 차에 남아 있어요.</p>
        {unlink.isError && <p className="mt-3 font-semibold text-rose">{errorMessage(unlink.error)}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setTarget(null)}>
            취소
          </Button>
          <Button
            variant="danger"
            disabled={unlink.isPending}
            onClick={() => target && unlink.mutate(target.id, { onSuccess: () => setTarget(null) })}
          >
            연결 해제
          </Button>
        </div>
      </Sheet>
    </Page>
  )
}
