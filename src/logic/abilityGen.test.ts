import { describe, it, expect, vi, afterEach } from 'vitest'
import { assignAbility, ABILITIES } from './abilityGen'

describe('assignAbility', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns a non-empty string', () => {
    expect(typeof assignAbility()).toBe('string')
    expect(assignAbility().length).toBeGreaterThan(0)
  })

  it('returns a non-Loaded ability verbatim when that index is selected', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // always picks index 0
    expect(assignAbility()).toBe(ABILITIES[0])
  })

  it('returns a parameterized string when Loaded is selected', () => {
    const loadedIdx = ABILITIES.indexOf('🎲Loaded')
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(loadedIdx / ABILITIES.length) // pick Loaded
      .mockReturnValueOnce(0.3)  // num1 = Math.floor(0.3*10)+1 = 4
      .mockReturnValueOnce(0.6)  // num2 = Math.floor(0.6*10)+11 = 17
    expect(assignAbility()).toBe('🎲Loaded: 4 become 17')
  })

  it('Loaded num1 is in [1, 10] and num2 is in [11, 20] at extremes', () => {
    const loadedIdx = ABILITIES.indexOf('🎲Loaded')
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(loadedIdx / ABILITIES.length)
      .mockReturnValueOnce(0.99) // num1 = Math.floor(9.9)+1 = 10
      .mockReturnValueOnce(0.99) // num2 = Math.floor(9.9)+11 = 20
    const result = assignAbility()
    const match = result.match(/🎲Loaded: (\d+) become (\d+)/)!
    expect(Number(match[1])).toBe(10)
    expect(Number(match[2])).toBe(20)
  })
})
