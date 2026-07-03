import { useGameStore } from '../../store/gameStore'
import type { Theme } from '../../logic/useTheme'
import type { ColorScheme } from '../../logic/diceGen'

interface SettingsModalProps {
  onClose: () => void
  theme: Theme
  onToggleTheme: () => void
}

export function SettingsModal({ onClose, theme, onToggleTheme }: SettingsModalProps) {
  const dieColorScheme = useGameStore(s => s.dieColorScheme)
  const setDieColorScheme = useGameStore(s => s.setDieColorScheme)
  const isDark = theme === 'dark'

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-72 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Dark mode */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</span>
          <button
            onClick={onToggleTheme}
            role="switch"
            aria-checked={isDark}
            aria-label="Toggle dark mode"
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-300 dark:bg-gray-600"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>

        {/* Die color scheme */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">Die Colors</span>
          <div className="flex rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 text-xs font-semibold">
            {(['classic', 'rwg'] as ColorScheme[]).map(s => (
              <button
                key={s}
                onClick={() => setDieColorScheme(s)}
                className={`px-2 py-1 transition-colors ${
                  dieColorScheme === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {s === 'classic' ? '🎨 Classic' : '🔴🟢 RWG'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
