interface ButtonProps {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'lg'
  className?: string
}

const VARIANTS = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-gray-900 dark:text-white',
  secondary: 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white',
  ghost: 'bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300',
}

const SIZES = {
  md: 'px-4 py-2 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

export function Button({ onClick, children, disabled, variant = 'primary', size = 'md', className = '' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg font-semibold transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
