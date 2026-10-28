import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:brightness-95',
  secondary: 'bg-surface text-ink border border-line hover:bg-sunken',
  ghost: 'text-ink-2 hover:bg-sunken',
  danger: 'bg-rose text-white hover:brightness-95',
}

const SIZES: Record<Size, string> = {
  md: 'h-12 px-5 text-base',
  lg: 'h-14 px-6 text-lg',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  block?: boolean
}

/** 누르면 살짝 눌림 (active:scale). 한 화면에 primary 는 하나 */
export function Button({ variant = 'primary', size = 'md', icon, block, className = '', children, ...rest }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-btn font-bold transition active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
