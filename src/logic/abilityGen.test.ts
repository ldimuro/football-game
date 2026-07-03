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

import { generateAbilityShopOffer, compatibleRosterPositions, abilityPositionLabel } from './abilityGen'
import { ENABLED_ABILITIES, SHOP_SLOTS } from './gameConstants'

describe('generateAbilityShopOffer', () => {
  it('returns exactly SHOP_SLOTS ability IDs', () => {
    const offer = generateAbilityShopOffer()
    expect(offer).toHaveLength(SHOP_SLOTS)
  })

  it('returns no duplicate ability IDs', () => {
    const offer = generateAbilityShopOffer()
    expect(new Set(offer).size).toBe(offer.length)
  })

  it('returns only IDs that are in ENABLED_ABILITIES', () => {
    const offer = generateAbilityShopOffer()
    for (const id of offer) {
      expect(ENABLED_ABILITIES.has(id)).toBe(true)
    }
  })
})

describe('compatibleRosterPositions', () => {
  it('returns all 8 positions for a general ability (second-half)', () => {
    const positions = compatibleRosterPositions('second-half')
    expect(positions).toHaveLength(8)
    expect(positions).toEqual(
      expect.arrayContaining(['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary'])
    )
  })

  it('returns only QB for play-action', () => {
    expect(compatibleRosterPositions('play-action')).toEqual(['QB'])
  })

  it('returns WR1 and WR2 for yac', () => {
    expect(compatibleRosterPositions('yac')).toEqual(expect.arrayContaining(['WR1', 'WR2']))
    expect(compatibleRosterPositions('yac')).toHaveLength(2)
  })

  it('returns OLine, DLine, Secondary for psychic', () => {
    const positions = compatibleRosterPositions('psychic')
    expect(positions).toEqual(expect.arrayContaining(['OLine', 'DLine', 'Secondary']))
    expect(positions).toHaveLength(3)
  })
})

describe('abilityPositionLabel', () => {
  it('returns "Any Player" for a general ability', () => {
    expect(abilityPositionLabel('second-half')).toBe('Any Player')
  })

  it('returns "QB" for play-action', () => {
    expect(abilityPositionLabel('play-action')).toBe('QB')
  })

  it('returns "WR" for yac (both WR slots map to same label)', () => {
    expect(abilityPositionLabel('yac')).toBe('WR')
  })

  it('returns multiple position names for psychic', () => {
    const label = abilityPositionLabel('psychic')
    expect(label).toContain('O-Line')
    expect(label).toContain('D-Line')
    expect(label).toContain('Secondary')
  })
})
