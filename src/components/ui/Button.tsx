interface ButtonProps {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
}

const VARIANTS = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-gray-900 dark:text-white',
  secondary: 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white',
  ghost: 'bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300',
}

export function Button({ onClick, children, disabled, variant = 'primary', className = '' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}
