import { describe, it, expect } from 'vitest'
import { LEAGUE_RULES, getDefaultOverrides, getRuleOverrides, getRandomRule } from './leagueRules'

describe('getDefaultOverrides', () => {
  it('returns all baseline values', () => {
    expect(getDefaultOverrides()).toEqual({
      tdPoints: 7, fgPoints: 3, tdYard: 100, fgRangeYard: 60,
      maxDowns: 4, noPuntingRule: false, pick2Rule: false,
      iceAge: false, dualTurnoverNumbers: false,
    })
  })
})

describe('getRuleOverrides', () => {
  function rule(id: string) {
    return LEAGUE_RULES.find(r => r.id === id)!
  }

  it('rz-starts-at-35: fgRangeYard=35, others unchanged', () => {
    const o = getRuleOverrides(rule('rz-starts-at-35'))
    expect(o.fgRangeYard).toBe(35)
    expect(o.tdPoints).toBe(7)
    expect(o.fgPoints).toBe(3)
  })
  it('field-125: tdYard=125', () => {
    expect(getRuleOverrides(rule('field-125')).tdYard).toBe(125)
  })
  it('altitude: fgRangeYard=50', () => {
    expect(getRuleOverrides(rule('altitude')).fgRangeYard).toBe(50)
  })
  it('kickers-people: fgPoints=6', () => {
    expect(getRuleOverrides(rule('kickers-people')).fgPoints).toBe(6)
  })
  it('no-punting: noPuntingRule=true', () => {
    expect(getRuleOverrides(rule('no-punting')).noPuntingRule).toBe(true)
  })
  it('fifth-down: maxDowns=5', () => {
    expect(getRuleOverrides(rule('fifth-down')).maxDowns).toBe(5)
  })
  it('ice-age: iceAge=true', () => {
    expect(getRuleOverrides(rule('ice-age')).iceAge).toBe(true)
  })
  it('defense-wins: dualTurnoverNumbers=true', () => {
    expect(getRuleOverrides(rule('defense-wins')).dualTurnoverNumbers).toBe(true)
  })
  it('pick-2: pick2Rule=true', () => {
    expect(getRuleOverrides(rule('pick-2')).pick2Rule).toBe(true)
  })
  it('parallel-universe: tdPoints=3 fgPoints=7', () => {
    const o = getRuleOverrides(rule('parallel-universe'))
    expect(o.tdPoints).toBe(3)
    expect(o.fgPoints).toBe(7)
  })
})

describe('getRandomRule', () => {
  it('always returns a rule from LEAGUE_RULES', () => {
    const ids = new Set(LEAGUE_RULES.map(r => r.id))
    for (let i = 0; i < 50; i++) {
      expect(ids.has(getRandomRule().id)).toBe(true)
    }
  })
  it('LEAGUE_RULES has exactly 10 entries', () => {
    expect(LEAGUE_RULES).toHaveLength(10)
  })
})
