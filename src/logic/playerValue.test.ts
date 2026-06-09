import { describe, it, expect } from 'vitest'
import { playerCost } from './playerValue'

describe('playerCost', () => {
  it('returns 30 for Legendary (≥98)', () => { expect(playerCost(99)).toBe(30) })
  it('returns 30 for Elite (≥93)', () => { expect(playerCost(95)).toBe(30) })
  it('returns 30 at the exact Elite boundary (93)', () => { expect(playerCost(93)).toBe(30) })
  it('returns 20 for Great (≥85)', () => { expect(playerCost(90)).toBe(20) })
  it('returns 20 at the exact Great boundary (85)', () => { expect(playerCost(85)).toBe(20) })
  it('returns 15 for Good (≥75)', () => { expect(playerCost(80)).toBe(15) })
  it('returns 10 for Average (≥65)', () => { expect(playerCost(70)).toBe(10) })
  it('returns 5 for Below Avg (<65)', () => { expect(playerCost(60)).toBe(5) })
  it('returns 5 for undefined rating', () => { expect(playerCost(undefined)).toBe(5) })
})
