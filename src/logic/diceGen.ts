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
  return pool[Math.floor(Math.random() * pool.length)]
}

export function dieColorClass(rating: number | undefined): string {
  const r = rating ?? 0
  if (r >= 98) return 'text-yellow-400 border-yellow-400'
  if (r >= 93) return 'text-purple-400 border-purple-400'
  if (r >= 85) return 'text-green-400 border-green-400'
  if (r >= 75) return 'text-blue-400 border-blue-400'
  if (r >= 65) return 'text-gray-400 border-gray-400'
  return 'text-gray-500 border-gray-500'
}
