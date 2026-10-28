import { LayoutDashboard, LogOut, Store } from 'lucide-react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { auth } from '../../lib/auth'
import { Logo } from '../../ui/Surfaces'

/** 사장님 웹 공통 틀. 로그인 안 했으면 로그인으로 (Spec REQ-P10, EDGE-P8) */
export function OwnerLayout() {
  const navigate = useNavigate()
  const client = useQueryClient()
  if (auth.ownerToken() === null) return <Navigate to="/owner/login" replace />

  const logout = () => {
    auth.setOwnerToken(null)
    client.removeQueries({ queryKey: ['owner'] })
    navigate('/owner/login', { replace: true })
  }

  const tab = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 rounded-btn px-4 h-11 font-bold transition ${isActive ? 'bg-brand-soft text-brand-strong' : 'text-ink-2 hover:bg-sunken'}`

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
          <Logo size={32} />
          <span className="mr-auto text-lg font-extrabold">
            웨이핏 <span className="text-ink-3">사장님</span>
          </span>
          <nav className="flex gap-1">
            <NavLink to="/owner" end className={tab}>
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">대시보드</span>
            </NavLink>
            <NavLink to="/owner/store" className={tab}>
              <Store size={18} />
              <span className="hidden sm:inline">매장 정보</span>
            </NavLink>
          </nav>
          <button onClick={logout} aria-label="로그아웃" className="rounded-btn p-2 text-ink-3 hover:bg-sunken">
            <LogOut size={20} />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
