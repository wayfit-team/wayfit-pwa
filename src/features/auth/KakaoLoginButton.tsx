import { useState } from 'react'
import { useNavigate } from 'react-router'
import { startKakaoLogin } from '../../lib/kakao'

/** 카카오 로그인 디자인 가이드: 배경 #FEE500, 검정 말풍선 심볼, 글자 85% 검정 */
export function KakaoLoginButton({ returnTo, label = '카카오 로그인' }: { returnTo: string; label?: string }) {
  const navigate = useNavigate()
  const [unconfigured, setUnconfigured] = useState(false)

  const onClick = () => {
    const start = startKakaoLogin(returnTo)
    if (start.kind === 'external') window.location.assign(start.url)
    else if (start.kind === 'internal') navigate(start.path)
    else setUnconfigured(true)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[12px] bg-[#FEE500] text-lg font-bold text-black/85 transition active:scale-[0.97]"
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C6.48 3 2 6.53 2 10.88c0 2.8 1.86 5.26 4.66 6.65l-.95 3.48c-.08.3.26.54.52.37l4.13-2.74c.54.06 1.08.1 1.64.1 5.52 0 10-3.53 10-7.86S17.52 3 12 3Z" />
        </svg>
        {label}
      </button>
      {unconfigured && (
        <p role="alert" className="text-center text-sm font-semibold text-rose">
          카카오 로그인이 아직 설정되지 않았어요 (VITE_KAKAO_REST_API_KEY)
        </p>
      )}
    </div>
  )
}
