import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { errorMessage } from '../../api/errors'
import { useOwnerLogin } from '../../api/queries'
import { auth } from '../../lib/auth'
import { Button } from '../../ui/Button'
import { Card, Logo } from '../../ui/Surfaces'

const input =
  'h-12 w-full rounded-btn border border-line bg-surface px-4 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useOwnerLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (auth.ownerToken() !== null) return <Navigate to="/owner" replace />

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate({ email, password }, { onSuccess: () => navigate('/owner', { replace: true }) })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size={56} />
        <h1 className="text-2xl font-extrabold">웨이핏 사장님</h1>
        <p className="text-ink-2">가는 길 손님을 우리 가게로</p>
      </div>
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-ink-2" htmlFor="email">
            이메일
          </label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          <label className="text-sm font-semibold text-ink-2" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
          {login.isError && (
            <p role="alert" className="font-semibold text-rose">
              {errorMessage(login.error)}
            </p>
          )}
          <Button type="submit" size="lg" block disabled={login.isPending} className="mt-2">
            로그인
          </Button>
        </form>
      </Card>
      <p className="text-center text-sm text-ink-3">계정은 웨이핏 운영팀이 발급해 드려요</p>
    </div>
  )
}
