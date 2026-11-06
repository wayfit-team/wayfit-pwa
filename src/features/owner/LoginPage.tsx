import { Navigate } from 'react-router'
import { useIsSignedIn } from '../../lib/auth'
import { Card, Logo } from '../../ui/Surfaces'
import { KakaoLoginButton } from '../auth/KakaoLoginButton'

/** 사장님도 운전자와 같은 카카오 로그인. 매장은 서버에서 카카오 회원번호로 연결된다 */
export function LoginPage() {
  const signedIn = useIsSignedIn()
  if (signedIn) return <Navigate to="/owner" replace />

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size={56} />
        <h1 className="text-2xl font-extrabold">웨이핏 사장님</h1>
        <p className="text-ink-2">가는 길 손님을 우리 가게로</p>
      </div>
      <Card>
        <KakaoLoginButton returnTo="/owner" />
      </Card>
      <p className="text-center text-sm text-ink-3">매장 등록은 웨이핏 운영팀이 카카오 계정에 연결해 드려요</p>
    </div>
  )
}
