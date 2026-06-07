import type { WeatherCondition } from '../../types'

const WEATHER_CONFIG: Record<WeatherCondition, { icon: string; label: string; color: string }> = {
  Clear: { icon: '☀️', label: 'Clear', color: 'text-yellow-300' },
  Dome: { icon: '🏟️', label: 'Dome', color: 'text-blue-300' },
  Rain: { icon: '🌧️', label: 'Rain', color: 'text-blue-400' },
  HeavyWind: { icon: '💨', label: 'Heavy Wind', color: 'text-gray-300' },
  Snow: { icon: '❄️', label: 'Snow', color: 'text-cyan-300' },
}

export function WeatherBadge({ condition }: { condition: WeatherCondition }) {
  const { icon, label, color } = WEATHER_CONFIG[condition]
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider">Conditions</p>
        <p className={`font-semibold ${color}`}>{label}</p>
      </div>
    </div>
  )
}
