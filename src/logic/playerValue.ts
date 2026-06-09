export function playerCost(rating: number | undefined): number {
  if (rating === undefined) return 5
  if (rating >= 93) return 30
  if (rating >= 85) return 20
  if (rating >= 75) return 15
  if (rating >= 65) return 10
  return 5
}
