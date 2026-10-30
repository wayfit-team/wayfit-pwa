import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useKakaoLogin } from '../../api/queries'
import { KAKAO_CALLBACK_PATH, consumeKakaoState } from '../../lib/kakao'
import { Page } from '../../ui/Surfaces'

/**
 * 카카오가 돌려준 /auth/kakao/callback?code=&state= 처리.
 * state 를 확인한 뒤 인가 코드를 백엔드에 넘겨 세션을 받고, 로그인 전에 있던 화면으로 돌아간다
 */
export function KakaoCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const login = useKakaoLogin()
  const [failure, setFailure] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const code = params.get('code')
    const pending = consumeKakaoState(params.get('state'))
    // 인가 코드가 주소창·방문 기록에 남지 않도록 지운다
    window.history.replaceState(window.history.state, '', KAKAO_CALLBACK_PATH)

    if (params.get('error')) {
      setFailure(params.get('error') === 'access_denied' ? '카카오 로그인을 취소했어요' : '카카오 로그인에 실패했어요. 다시 시도해 주세요')
      return
    }
    if (!code || !pending) {
      setFailure('로그인 요청을 확인하지 못했어요. 처음부터 다시 시도해 주세요')
      return
    }
    login.mutate(code, {
      onSuccess: () => navigate(pending.returnTo, { replace: true }),
      onError: (e) => setFailure(errorMessage(e)),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Page>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {failure ? (
          <>
            <p role="alert" className="rounded-btn bg-rose-soft px-4 py-3 font-semibold text-rose">
              {failure}
            </p>
            <Link to="/coupons" replace className="font-bold text-brand-strong underline underline-offset-4">
              처음으로
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="animate-spin text-brand-strong" size={48} />
            <p className="text-xl font-bold">카카오로 로그인하고 있어요</p>
          </>
        )}
      </div>
    </Page>
  )
}
