import type { ReactNode } from 'react'
import { Link } from 'react-router'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-surface p-5 shadow-sm ${className}`}>{children}</div>
}

type Tone = 'brand' | 'neutral' | 'amber' | 'rose'

const TONES: Record<Tone, string> = {
  brand: 'bg-brand-soft text-brand-strong',
  neutral: 'bg-sunken text-ink-2',
  amber: 'bg-amber-soft text-amber',
  rose: 'bg-rose-soft text-rose',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-sunken ${className}`} />
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-sm bg-brand font-black text-on-brand"
      style={{ width: size, height: size, fontSize: size * 0.6 }}
      aria-hidden
    >
      W
    </span>
  )
}

/** 운전자 화면 공통 틀: 폰 폭 기준 가운데 정렬 */
export function Page({ children, title, right }: { children: ReactNode; title?: string; right?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-[max(16px,env(safe-area-inset-top))]">
      <header className="mb-4 flex items-center justify-between">
        <Link to="/coupons" className="flex items-center gap-2">
          <Logo size={32} />
          <span className="text-lg font-extrabold">{title ?? '웨이핏'}</span>
        </Link>
        {right}
      </header>
      {children}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-card bg-sunken text-ink-3">{icon}</div>
      <p className="text-lg font-bold">{title}</p>
      {body && <p className="text-ink-2">{body}</p>}
      {action}
    </div>
  )
}
