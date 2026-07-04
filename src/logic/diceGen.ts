import { rng } from './rng'

export const DIE_POOLS: Record<string, number[][]> = {
  LEGENDARY: [
    [20, 20, 20, 20, 20, 20],
    [18, 19, 19, 19, 19, 20],
    [15, 15, 15, 20, 20, 20],
  ],
  ELITE: [
    [15, 16, 17, 18, 19, 20],
    [5, 5, 5, 20, 20, 20],
    [15, 15, 16, 16, 17, 17],
    [16, 16, 16, 17, 17, 17],
    [10, 16, 16, 16, 16, 20],
  ],
  GREAT: [
    [8, 9, 10, 10, 11, 12],
    [10, 10, 10, 15, 15, 15],
    [12, 12, 13, 13, 14, 14],
    [13, 13, 13, 14, 14, 14],
    [2, 3, 4, 18, 19, 20],
    [10, 14, 14, 14, 14, 18],
    [3, 3, 3, 18, 18, 18],
    [1, 1, 1, 1, 1, 20],
  ],
  GOOD: [
    [8, 8, 9, 9, 10, 10],
    [7, 7, 7, 10, 10, 10],
    [6, 7, 8, 9, 10, 11],
    [1, 2, 3, 15, 16, 17],
    [8, 12, 12, 12, 12, 16],
    [3, 3, 3, 15, 15, 15],
    [1, 1, 1, 1, 1, 20],
  ],
  AVERAGE: [
    [4, 5, 6, 7, 8, 9],
    [5, 5, 5, 10, 10, 10],
    [7, 7, 7, 7, 7, 7],
    [1, 2, 3, 10, 11, 12],
    [4, 7, 7, 7, 7, 10],
    [1, 1, 1, 10, 10, 10],
    [1, 1, 1, 1, 1, 20],
  ],
  BELOW_AVG: [
    [1, 2, 3, 4, 5, 6],
    [1, 1, 1, 5, 5, 5],
    [3, 3, 3, 3, 3, 3],
    [1, 2, 3, 4, 5, 10],
    [1, 1, 1, 1, 1, 10],
  ],
}

function tierForRating(rating: number | undefined): string {
  if (rating === undefined) return 'BELOW_AVG'
  if (rating >= 98) return 'LEGENDARY'
  if (rating >= 93) return 'ELITE'
  if (rating >= 85) return 'GREAT'
  if (rating >= 75) return 'GOOD'
  if (rating >= 65) return 'AVERAGE'
  return 'BELOW_AVG'
}

export function assignDie(rating: number | undefined): number[] {
  const pool = DIE_POOLS[tierForRating(rating)]
  return pool[Math.floor(rng() * pool.length)]
}

export type ColorScheme = 'classic' | 'rwg'

// Red-White-Green: low values = bright red, midpoint (~10-11) = white, high values = bright green
const RWG_CLASSES: Record<number, string> = {
  1:  'bg-red-700 text-white',
  2:  'bg-red-600 text-white',
  3:  'bg-red-500 text-white',
  4:  'bg-red-400 text-white',
  5:  'bg-red-300 text-gray-900',
  6:  'bg-red-200 text-gray-900',
  7:  'bg-red-100 text-gray-900',
  8:  'bg-red-50 text-gray-900',
  9:  'bg-white text-gray-900',
  10: 'bg-white text-gray-900',
  11: 'bg-white text-gray-900',
  12: 'bg-green-50 text-gray-900',
  13: 'bg-green-100 text-gray-900',
  14: 'bg-green-200 text-gray-900',
  15: 'bg-green-300 text-gray-900',
  16: 'bg-green-400 text-gray-900',
  17: 'bg-green-500 text-white',
  18: 'bg-green-600 text-white',
  19: 'bg-green-700 text-white',
  20: 'bg-green-800 text-white',
}

export function faceColorClass(value: number, scheme: ColorScheme = 'classic'): string {
  if (scheme === 'rwg') {
    return RWG_CLASSES[value] ?? (value <= 10 ? 'bg-red-50 text-gray-900' : 'bg-green-50 text-gray-900')
  }
  if (value >= 19) return 'bg-purple-400 text-gray-900 dark:text-white'
  if (value >= 16) return 'bg-green-400 text-gray-900 dark:text-white'
  if (value >= 12) return 'bg-blue-400 text-gray-900 dark:text-white'
  if (value >= 8)  return 'bg-orange-400 text-gray-900 dark:text-white'
  if (value >= 4)  return 'bg-yellow-400 text-gray-900 dark:text-white'
  return 'bg-red-400 text-gray-900 dark:text-white'
}
