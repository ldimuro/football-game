import { useGameStore } from '../../store/gameStore'
import { OpponentPreview } from './OpponentPreview'
import { WeatherBadge } from './WeatherBadge'
import { TeamStatsSummary } from './TeamStatsSummary'
import { Button } from '../ui/Button'

export function RoundHub() {
  const { round, roster, currentOpponent, currentWeather, viewDraftOffer, isLoading } = useGameStore()

  if (!currentOpponent || !currentWeather) return null

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">NFL Season</p>
          <h1 className="text-3xl font-bold text-white">Week {round} <span className="text-gray-500 text-xl font-normal">of 17</span></h1>
        </div>
        <Button onClick={viewDraftOffer} disabled={isLoading}>
          View Draft Offer →
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <OpponentPreview opponent={currentOpponent} />
        <div className="flex flex-col gap-4">
          <WeatherBadge condition={currentWeather} />
          <TeamStatsSummary roster={roster} />
        </div>
      </div>
    </div>
  )
}
