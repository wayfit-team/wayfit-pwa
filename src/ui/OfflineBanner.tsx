import { WifiOff } from 'lucide-react'
import { useOnline } from '../lib/online'

/** 오프라인이면 마지막으로 받은 쿠폰을 보여주고 있다는 걸 알린다 (Spec REQ-P6) */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="mb-3 flex items-center gap-2 rounded-btn bg-amber-soft px-4 py-3 text-sm font-semibold text-amber">
      <WifiOff size={18} />
      오프라인이에요 · 마지막으로 받은 쿠폰을 보여드려요
    </div>
  )
}
