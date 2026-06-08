import { useGameStore } from '../../store/gameStore'
import { TeamStatsSummary } from '../round/TeamStatsSummary'

export function CompleteScreen() {
  const { roster, seasonLog } = useGameStore()
  const drafted = seasonLog.filter(r => r.draftedId !== null).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-sm mb-2">Season Complete</p>
      <h1 className="text-5xl font-black text-gray-900 dark:text-white mb-4">17 Weeks Done</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-10">You drafted {drafted} player{drafted !== 1 ? 's' : ''} over the season.</p>
      <div className="text-left">
        <TeamStatsSummary roster={roster} />
      </div>
    </div>
  )
}
