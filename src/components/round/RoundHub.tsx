import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { MatchupSummary } from './MatchupSummary'
import { PositionMatchups } from './PositionMatchups'
import { SimulationModal } from './SimulationModal'
import { ShopModal } from './ShopModal'
import { Button } from '../ui/Button'

export function RoundHub() {
  const {
    round, roster, currentOpponent, currentOpponentRoster, currentWeather,
    viewDraftOffer, simulateGame, draftComplete, isLoading, seasonLog,
    coins, shopComplete,
  } = useGameStore()
  const [shopOpen, setShopOpen] = useState(false)

  const wins = seasonLog.filter(r => r.result === 'win').length
  const losses = seasonLog.filter(r => r.result === 'loss').length
  const ties = seasonLog.filter(r => r.result === 'tie').length

  if (!currentOpponent || !currentOpponentRoster || !currentWeather) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">NFL Season</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Week {round} <span className="text-gray-400 dark:text-gray-500 text-xl font-normal">of 17</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
            {wins}–{losses}{ties > 0 ? `–${ties}` : ''}
          </p>
          <p className="text-xs mt-0.5 tabular-nums">
            <span className="text-yellow-500 dark:text-yellow-400 font-semibold">{coins}</span>
            <span className="text-gray-500 dark:text-gray-400"> / 100 coins</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShopOpen(true)}
            disabled={isLoading || shopComplete}
            variant="secondary"
          >
            {shopComplete ? 'Shop ✓' : 'Shop'}
          </Button>
          <Button onClick={viewDraftOffer} disabled={isLoading || draftComplete} variant="secondary">
            View Draft Offer →
          </Button>
          <Button onClick={simulateGame} disabled={isLoading}>
            Simulate Game
          </Button>
        </div>
      </div>
      <MatchupSummary
        userRoster={roster}
        opponentRoster={currentOpponentRoster}
        opponentTeam={currentOpponent.team}
        opponentYear={currentOpponent.year}
        weather={currentWeather}
      />
      <div className="mt-4">
        <PositionMatchups
          opponentTeam={currentOpponent.team}
          opponentRoster={currentOpponentRoster}
          userRoster={roster}
        />
      </div>
      <SimulationModal />
      {shopOpen && <ShopModal onClose={() => setShopOpen(false)} />}
    </div>
  )
}
