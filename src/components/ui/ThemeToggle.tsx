import type { Theme } from '../../logic/useTheme'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
  className?: string
}

export function ThemeToggle({ theme, onToggle, className = '' }: ThemeToggleProps) {
  const isDark = theme === 'dark'

  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-300 dark:bg-gray-700 ${className}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  )
}
