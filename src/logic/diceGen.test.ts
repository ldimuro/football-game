import { describe, it, expect } from 'vitest'
import { assignDie, dieColorClass, DIE_POOLS } from './diceGen'

describe('assignDie', () => {
  it('returns exactly 6 face values', () => {
    expect(assignDie(90)).toHaveLength(6)
  })

  it('returns a die from the LEGENDARY pool for rating 98', () => {
    const die = assignDie(98)
    expect(DIE_POOLS.LEGENDARY).toContainEqual(die)
  })

  it('returns a die from the LEGENDARY pool for rating 100', () => {
    const die = assignDie(100)
    expect(DIE_POOLS.LEGENDARY).toContainEqual(die)
  })

  it('returns a die from the ELITE pool for rating 93', () => {
    const die = assignDie(93)
    expect(DIE_POOLS.ELITE).toContainEqual(die)
  })

  it('returns a die from the GREAT pool for rating 85', () => {
    const die = assignDie(85)
    expect(DIE_POOLS.GREAT).toContainEqual(die)
  })

  it('returns a die from the GOOD pool for rating 75', () => {
    const die = assignDie(75)
    expect(DIE_POOLS.GOOD).toContainEqual(die)
  })

  it('returns a die from the AVERAGE pool for rating 65', () => {
    const die = assignDie(65)
    expect(DIE_POOLS.AVERAGE).toContainEqual(die)
  })

  it('returns a die from the BELOW_AVG pool for rating 64', () => {
    const die = assignDie(64)
    expect(DIE_POOLS.BELOW_AVG).toContainEqual(die)
  })

  it('returns a die from the BELOW_AVG pool for undefined rating', () => {
    const die = assignDie(undefined)
    expect(DIE_POOLS.BELOW_AVG).toContainEqual(die)
  })
})

describe('dieColorClass', () => {
  it('returns yellow class for legendary rating', () => {
    expect(dieColorClass(98)).toContain('yellow-400')
  })

  it('returns purple class for elite rating', () => {
    expect(dieColorClass(93)).toContain('purple-400')
  })

  it('returns green class for great rating', () => {
    expect(dieColorClass(85)).toContain('green-400')
  })

  it('returns blue class for good rating', () => {
    expect(dieColorClass(75)).toContain('blue-400')
  })

  it('returns gray-400 class for average rating', () => {
    expect(dieColorClass(65)).toContain('gray-400')
  })

  it('returns gray-500 class for below avg rating', () => {
    expect(dieColorClass(60)).toContain('gray-500')
  })
})
