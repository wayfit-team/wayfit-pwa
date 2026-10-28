import { Share, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../ui/Button'

const DISMISS_KEY = 'wf.installDismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function dismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** 첫 연결 후 홈 화면 추가 안내. 닫으면 다시 묻지 않는다 (Spec REQ-P7) */
export function InstallPrompt({ visible }: { visible: boolean }) {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(dismissed)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!visible || hidden || isStandalone() || (!event && !isIos())) return null

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // 저장 못 하면 이번 세션만 숨김
    }
    setHidden(true)
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-sm">
      <div className="flex-1">
        <p className="font-bold">홈 화면에 추가해 두세요</p>
        {event ? (
          <p className="mt-1 text-sm text-ink-2">계산대에서 바로 쿠폰을 열 수 있어요</p>
        ) : (
          <p className="mt-1 text-sm text-ink-2">
            Safari 아래 <Share size={14} className="inline" /> 공유 → <b>홈 화면에 추가</b>
          </p>
        )}
        {event && (
          <Button className="mt-3" onClick={() => void event.prompt().then(close)}>
            추가하기
          </Button>
        )}
      </div>
      <button aria-label="닫기" onClick={close} className="rounded-sm p-1 text-ink-3 hover:bg-sunken">
        <X size={20} />
      </button>
    </div>
  )
}
