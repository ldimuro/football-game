interface ButtonProps {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
}

const VARIANTS = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
  ghost: 'bg-transparent hover:bg-gray-800 text-gray-300',
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
