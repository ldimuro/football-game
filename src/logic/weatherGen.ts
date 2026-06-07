import type { WeatherCondition } from '../types'

const WEATHER_WEIGHTS: [WeatherCondition, number][] = [
  ['Clear', 50],
  ['Dome', 20],
  ['Rain', 15],
  ['HeavyWind', 10],
  ['Snow', 5],
]

const TOTAL_WEIGHT = WEATHER_WEIGHTS.reduce((sum, [, w]) => sum + w, 0)

export function generateWeather(): WeatherCondition {
  let rand = Math.random() * TOTAL_WEIGHT
  for (const [condition, weight] of WEATHER_WEIGHTS) {
    rand -= weight
    if (rand <= 0) return condition
  }
  return 'Clear'
}
