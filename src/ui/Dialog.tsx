import { useEffect, type ReactNode } from 'react'

/** 모바일은 바텀시트, 넓은 화면은 가운데. ESC·바깥 탭으로 닫힘 ([dismissible] false 면 막음) */
export function Sheet({
  open,
  onClose,
  children,
  label,
  dismissible = true,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  label: string
  dismissible?: boolean
}) {
  useEffect(() => {
    if (!open || !dismissible) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, dismissible, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40" onClick={dismissible ? onClose : undefined} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative w-full max-w-md rounded-t-card bg-surface p-6 pb-[max(24px,env(safe-area-inset-bottom))] shadow-lg sm:rounded-card"
      >
        {children}
      </div>
    </div>
  )
}
