import { describe, it, expect, beforeEach } from 'vitest'
import { seedRng } from './rng'
import { drawHand, applyCardYards, CARDS } from './playbookCards'

describe('drawHand', () => {
  beforeEach(() => { seedRng('test-seed-playbookcards') })

  it('returns exactly n cards', () => {
    expect(drawHand(4)).toHaveLength(4)
    expect(drawHand(5)).toHaveLength(5)
  })

  it('all returned cards are valid PlaybookCards', () => {
    const hand = drawHand(4)
    for (const card of hand) {
      expect(card.id).toBeDefined()
      expect(card.name).toBeDefined()
      expect(['run', 'pass']).toContain(card.playType)
      expect(card.mechanic).toBeDefined()
    }
  })

  it('skews toward Dive and Quick Pass over specialty cards', () => {
    seedRng('distribution-test-playbookcards')
    const counts: Record<string, number> = {}
    for (let i = 0; i < 1000; i++) {
      const [card] = drawHand(1)
      counts[card.id] = (counts[card.id] ?? 0) + 1
    }
    const diveCount = counts['dive'] ?? 0
    const offtackleCount = counts['off-tackle'] ?? 0
    expect(diveCount).toBeGreaterThan(offtackleCount * 1.5)
    expect(counts['quick-pass'] ?? 0).toBeGreaterThan(offtackleCount * 1.5)
  })
})

describe('applyCardYards', () => {
  const baseCtx: import('../types').CardYardsContext = {
    runsThisDrive: 0,
    prevPlayCall: null,
    qbRoll: 0,
  }

  it('vanilla: returns standard yards with no card bonus', () => {
    const result = applyCardYards(CARDS['dive'], 15, 8, 5, baseCtx)
    expect(result).toEqual({ yards: 12, cardBonus: 0 })
  })

  it('off-tackle: floors net yards at 0', () => {
    const result = applyCardYards(CARDS['off-tackle'], 5, 20, -5, baseCtx)
    expect(result.yards).toBe(0)
    expect(result.cardBonus).toBe(0)
  })

  it('off-tackle: positive yards pass through unchanged', () => {
    const result = applyCardYards(CARDS['off-tackle'], 15, 5, 5, baseCtx)
    expect(result.yards).toBe(15)
  })

  it('ramp-run: +3 per run, capped at +12', () => {
    expect(applyCardYards(CARDS['ground-and-pound'], 10, 5, 5, { ...baseCtx, runsThisDrive: 0 }).cardBonus).toBe(0)
    expect(applyCardYards(CARDS['ground-and-pound'], 10, 5, 5, { ...baseCtx, runsThisDrive: 2 }).cardBonus).toBe(6)
    expect(applyCardYards(CARDS['ground-and-pound'], 10, 5, 5, { ...baseCtx, runsThisDrive: 4 }).cardBonus).toBe(12)
    expect(applyCardYards(CARDS['ground-and-pound'], 10, 5, 5, { ...baseCtx, runsThisDrive: 10 }).cardBonus).toBe(12)
  })

  it('ramp-run: adds bonus to base yards', () => {
    const result = applyCardYards(CARDS['ground-and-pound'], 10, 5, 5, { ...baseCtx, runsThisDrive: 3 })
    expect(result.yards).toBe(10 - 5 + 5 + 9)  // 19
    expect(result.cardBonus).toBe(9)
  })

  it('play-action-bonus: +8 if prev was run, 0 otherwise', () => {
    expect(applyCardYards(CARDS['play-action'], 10, 5, 5, { ...baseCtx, prevPlayCall: 'run' }).cardBonus).toBe(8)
    expect(applyCardYards(CARDS['play-action'], 10, 5, 5, { ...baseCtx, prevPlayCall: 'pass' }).cardBonus).toBe(0)
    expect(applyCardYards(CARDS['play-action'], 10, 5, 5, { ...baseCtx, prevPlayCall: null }).cardBonus).toBe(0)
  })

  it('play-action-bonus: adds bonus to yards', () => {
    const result = applyCardYards(CARDS['play-action'], 10, 5, 5, { ...baseCtx, prevPlayCall: 'run' })
    expect(result.yards).toBe(10 - 5 + 5 + 8)  // 18
  })

  it('hail-mary success (QB >= 16): offTotal×2 − defTotal + bonus', () => {
    const result = applyCardYards(CARDS['hail-mary'], 12, 6, 5, { ...baseCtx, qbRoll: 16 })
    expect(result.yards).toBe(12 * 2 - 6 + 5)  // 23
    expect(result.cardBonus).toBe(12)
  })

  it('hail-mary: QB exactly 16 is success', () => {
    const result = applyCardYards(CARDS['hail-mary'], 12, 6, 5, { ...baseCtx, qbRoll: 16 })
    expect(result.yards).toBeGreaterThan(0)
  })

  it('hail-mary fail (QB < 16): yards = 0, breakdown sums correctly', () => {
    const result = applyCardYards(CARDS['hail-mary'], 12, 6, 5, { ...baseCtx, qbRoll: 15 })
    expect(result.yards).toBe(0)
    // cardBonus offsets the base yards so breakdown: offTotal - defTotal + bonus + cardBonus = 0
    expect(12 - 6 + 5 + result.cardBonus).toBe(0)
  })

  it('null card: returns standard yards', () => {
    const result = applyCardYards(null, 10, 5, 5, baseCtx)
    expect(result).toEqual({ yards: 10, cardBonus: 0 })
  })
})
