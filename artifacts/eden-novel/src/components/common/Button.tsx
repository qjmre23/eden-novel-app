import { motion, useReducedMotion } from 'framer-motion'
import { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'amber'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
  fullWidth?: boolean
}

const variants = {
  primary:   'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]',
  secondary: 'bg-[#1a1a26] hover:bg-[#22223a] text-[#e6e6f0] border border-white/08',
  ghost:     'bg-transparent hover:bg-white/05 text-[#e6e6f0] border border-transparent',
  danger:    'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30',
  amber:     'bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30',
}

const sizes = {
  sm: 'px-3 py-1.5 text-[13px] rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading,
  fullWidth,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const reduced = useReducedMotion()

  return (
    <motion.button
      whileTap={reduced ? {} : { scale: 0.97 }}
      whileHover={reduced ? {} : { scale: 1.01 }}
      transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
      className={`
        relative inline-flex items-center justify-center gap-2
        font-medium tracking-wide transition-colors duration-150
        cursor-pointer select-none
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center rounded-[inherit]">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70" />
        </span>
      )}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
    </motion.button>
  )
}
