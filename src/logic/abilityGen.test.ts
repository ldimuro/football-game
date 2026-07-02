import { describe, it, expect, vi, afterEach } from 'vitest'
import { assignAbility, ABILITY_RATE } from './abilityGen'

afterEach(() => vi.restoreAllMocks())

describe('ABILITY_RATE', () => {
  it('is 0.4', () => expect(ABILITY_RATE).toBe(0.4))
})

describe('assignAbility', () => {
  it('returns undefined when Math.random() >= ABILITY_RATE', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5)
    expect(assignAbility('QB')).toBeUndefined()
  })

  it('returns a string when Math.random() < ABILITY_RATE', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)  // rate check: assign
      .mockReturnValueOnce(0)    // pick index 0 from pool
    expect(typeof assignAbility('QB')).toBe('string')
  })

  it('K does not receive OLine-specific abilities', () => {
    // Force assignment, run 200 times — no OLine ability should appear
    vi.spyOn(Math, 'random').mockImplementation(() => 0.1)
    const results = new Set(Array.from({ length: 200 }, () => assignAbility('K')))
    expect(results.has('air-raid')).toBe(false)
    expect(results.has('bull-rush')).toBe(false)
    expect(results.has('psychic')).toBe(false)
  })

  it('OLine can receive OLine-specific abilities', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)   // rate check: assign
      .mockReturnValueOnce(0.999) // pick last element of OLine pool
    // OLine pool = 12 ALL + ['air-raid','ground-and-pound','psychic'] = 15 items; last = 'psychic'
    expect(assignAbility('OLine')).toBe('psychic')
  })

  it('DLine can receive DLine-specific abilities', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.999) // last in DLine pool
    // DLine pool = 12 ALL + ['bull-rush','brick-wall','stack-the-box','psychic','bend-dont-break'] = 17; last = 'bend-dont-break'
    expect(assignAbility('DLine')).toBe('bend-dont-break')
  })

  it('Secondary can receive Secondary-specific abilities', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.999)
    // Secondary pool = 12 ALL + ['bend-dont-break','on-an-island','no-fly-zone','psychic'] = 16; last = 'psychic'
    expect(assignAbility('Secondary')).toBe('psychic')
  })
})
