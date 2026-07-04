import { describe, it, expect } from 'vitest'
import {
  computeRollBonus, computePostRollBonus, isPostRollAbility, ABILITY_DISPLAY,
} from './abilityEngine'
import type { AbilityContext } from './abilityEngine'

const base: AbilityContext = {
  quarter: 1,
  driveIndex: 0,
  possession: 'user',
  playerSide: 'offense',
  playerTeamIsLosing: false,
  isLastTeamDrive: false,
  driveProgress: 20,
  rzYard: 80,
  down: 1,
  playCall: 'pass',
  weather: 'Clear',
  ownPlayHistory: [],
  oppPlayHistory: [],
  ownRunsThisDrive: 0,
  wrYacActive: false,
  olineRoll: null,
  opponentWRRating: undefined,
  allOffRolls: [],
  allDefRolls: [],
  downHistory: [],
  feedTheBeastBonus: 0,
  abilityCounter: 0,
}

describe('ABILITY_DISPLAY', () => {
  it('has an entry for evens', () => expect(ABILITY_DISPLAY['evens']).toBeTruthy())
  it('has an entry for psychic', () => expect(ABILITY_DISPLAY['psychic']).toBeTruthy())
  it('has an entry for yac', () => expect(ABILITY_DISPLAY['yac']).toBeTruthy())
})

describe('isPostRollAbility', () => {
  it('returns true for blessed-evens', () => expect(isPostRollAbility('blessed-evens')).toBe(true))
  it('returns true for blessed-odds', () => expect(isPostRollAbility('blessed-odds')).toBe(true))
  it('returns false for evens', () => expect(isPostRollAbility('evens')).toBe(false))
  it('returns false for unknown id', () => expect(isPostRollAbility('unknown')).toBe(false))
})

describe('computeRollBonus — evens / odds', () => {
  it('evens: +5 on even roll', () => expect(computeRollBonus('evens', 10, base)).toBe(5))
  it('evens: 0 on odd roll', () => expect(computeRollBonus('evens', 9, base)).toBe(0))
  it('odds: +5 on odd roll', () => expect(computeRollBonus('odds', 7, base)).toBe(5))
  it('odds: 0 on even roll', () => expect(computeRollBonus('odds', 8, base)).toBe(0))
  it('evil-evens: +7 on even roll', () => expect(computeRollBonus('evil-evens', 12, base)).toBe(7))
  it('evil-evens: -3 on odd roll', () => expect(computeRollBonus('evil-evens', 11, base)).toBe(-3))
  it('evil-odds: +7 on odd roll', () => expect(computeRollBonus('evil-odds', 13, base)).toBe(7))
  it('evil-odds: -3 on even roll', () => expect(computeRollBonus('evil-odds', 14, base)).toBe(-3))
})

describe('computeRollBonus — time / score', () => {
  it('second-half: +5 in Q3', () => expect(computeRollBonus('second-half', 5, { ...base, quarter: 3 })).toBe(5))
  it('second-half: +5 in Q4', () => expect(computeRollBonus('second-half', 5, { ...base, quarter: 4 })).toBe(5))
  it('second-half: 0 in Q1', () => expect(computeRollBonus('second-half', 5, { ...base, quarter: 1 })).toBe(0))
  it('clutch: +10 in Q4', () => expect(computeRollBonus('clutch', 5, { ...base, quarter: 4 })).toBe(10))
  it('clutch: 0 in Q3', () => expect(computeRollBonus('clutch', 5, { ...base, quarter: 3 })).toBe(0))
  it('comeback-kid: +5 when losing', () => expect(computeRollBonus('comeback-kid', 5, { ...base, playerTeamIsLosing: true })).toBe(5))
  it('comeback-kid: 0 when not losing', () => expect(computeRollBonus('comeback-kid', 5, { ...base, playerTeamIsLosing: false })).toBe(0))
  it('two-minute-drill: +15 on last team drive for offense', () =>
    expect(computeRollBonus('two-minute-drill', 5, { ...base, playerSide: 'offense', isLastTeamDrive: true })).toBe(15))
  it('two-minute-drill: 0 when on defense even if last drive', () =>
    expect(computeRollBonus('two-minute-drill', 5, { ...base, playerSide: 'defense', isLastTeamDrive: true })).toBe(0))
  it('two-minute-drill: 0 when not last drive', () =>
    expect(computeRollBonus('two-minute-drill', 5, { ...base, playerSide: 'offense', isLastTeamDrive: false })).toBe(0))
})

describe('computeRollBonus — weather', () => {
  it('rain-man: +5 in Rain', () => expect(computeRollBonus('rain-man', 5, { ...base, weather: 'Rain' })).toBe(5))
  it('rain-man: 0 in Clear', () => expect(computeRollBonus('rain-man', 5, { ...base, weather: 'Clear' })).toBe(0))
  it('snow-man: +5 in Snow', () => expect(computeRollBonus('snow-man', 5, { ...base, weather: 'Snow' })).toBe(5))
  it('snow-man: 0 in Rain', () => expect(computeRollBonus('snow-man', 5, { ...base, weather: 'Rain' })).toBe(0))
})

describe('computeRollBonus — OLine', () => {
  it('air-raid: +5 on pass', () => expect(computeRollBonus('air-raid', 5, { ...base, playCall: 'pass' })).toBe(5))
  it('air-raid: 0 on run', () => expect(computeRollBonus('air-raid', 5, { ...base, playCall: 'run' })).toBe(0))
  it('ground-and-pound: +5 on run', () => expect(computeRollBonus('ground-and-pound', 5, { ...base, playCall: 'run' })).toBe(5))
  it('ground-and-pound: 0 on pass', () => expect(computeRollBonus('ground-and-pound', 5, { ...base, playCall: 'pass' })).toBe(0))
})

describe('computeRollBonus — psychic', () => {
  it('0 when opponent has not repeated', () =>
    expect(computeRollBonus('psychic', 5, { ...base, playerSide: 'offense', oppPlayHistory: [], playCall: 'run' })).toBe(0))
  it('+5 when opponent repeats same play 2nd time in a row (offense player)', () =>
    expect(computeRollBonus('psychic', 5, { ...base, playerSide: 'offense', oppPlayHistory: ['run'], playCall: 'run' })).toBe(5))
  it('+7 on 3rd consecutive opponent repeat (offense player)', () =>
    expect(computeRollBonus('psychic', 5, { ...base, playerSide: 'offense', oppPlayHistory: ['run', 'run'], playCall: 'run' })).toBe(7))
  it('0 when opponent switches play type', () =>
    expect(computeRollBonus('psychic', 5, { ...base, playerSide: 'offense', oppPlayHistory: ['run', 'run'], playCall: 'pass' })).toBe(0))
  it('+7 when opponent repeats 3rd time (defense player)', () =>
    expect(computeRollBonus('psychic', 5, { ...base, playerSide: 'defense', oppPlayHistory: ['pass', 'pass'], playCall: 'pass' })).toBe(7))
})

describe('computeRollBonus — DLine', () => {
  it('bull-rush: +7 when olineRoll <= dlineRoll on pass', () =>
    expect(computeRollBonus('bull-rush', 10, { ...base, playCall: 'pass', olineRoll: 8 })).toBe(7))
  it('bull-rush: +7 when olineRoll === dlineRoll', () =>
    expect(computeRollBonus('bull-rush', 8, { ...base, playCall: 'pass', olineRoll: 8 })).toBe(7))
  it('bull-rush: 0 when olineRoll > dlineRoll', () =>
    expect(computeRollBonus('bull-rush', 6, { ...base, playCall: 'pass', olineRoll: 10 })).toBe(0))
  it('bull-rush: 0 on run play', () =>
    expect(computeRollBonus('bull-rush', 10, { ...base, playCall: 'run', olineRoll: 8 })).toBe(0))
  it('brick-wall: +7 when olineRoll <= dlineRoll on run', () =>
    expect(computeRollBonus('brick-wall', 12, { ...base, playCall: 'run', olineRoll: 10 })).toBe(7))
  it('brick-wall: 0 on pass play', () =>
    expect(computeRollBonus('brick-wall', 12, { ...base, playCall: 'pass', olineRoll: 10 })).toBe(0))
  it('stack-the-box: +5 on 2nd consecutive run by opponent', () =>
    expect(computeRollBonus('stack-the-box', 5, { ...base, playCall: 'run', oppPlayHistory: ['run'] })).toBe(5))
  it('stack-the-box: +7 on 3rd consecutive run', () =>
    expect(computeRollBonus('stack-the-box', 5, { ...base, playCall: 'run', oppPlayHistory: ['run', 'run'] })).toBe(7))
  it('stack-the-box: 0 when opponent switches to pass', () =>
    expect(computeRollBonus('stack-the-box', 5, { ...base, playCall: 'pass', oppPlayHistory: ['run', 'run'] })).toBe(0))
  it('bend-dont-break: +5 at driveProgress 80', () =>
    expect(computeRollBonus('bend-dont-break', 5, { ...base, driveProgress: 80 })).toBe(5))
  it('bend-dont-break: 0 at driveProgress 79', () =>
    expect(computeRollBonus('bend-dont-break', 5, { ...base, driveProgress: 79 })).toBe(0))
})

describe('computeRollBonus — Secondary', () => {
  it('no-fly-zone: +5 on 2nd consecutive pass by opponent', () =>
    expect(computeRollBonus('no-fly-zone', 5, { ...base, playerSide: 'defense', playCall: 'pass', oppPlayHistory: ['pass'] })).toBe(5))
  it('no-fly-zone: 0 on run play', () =>
    expect(computeRollBonus('no-fly-zone', 5, { ...base, playerSide: 'defense', playCall: 'run', oppPlayHistory: ['pass', 'pass'] })).toBe(0))
  it('on-an-island: +5 when opponent WR rating is 93 (Elite)', () =>
    expect(computeRollBonus('on-an-island', 5, { ...base, opponentWRRating: 93 })).toBe(5))
  it('on-an-island: +5 when opponent WR rating is 98 (Legendary)', () =>
    expect(computeRollBonus('on-an-island', 5, { ...base, opponentWRRating: 98 })).toBe(5))
  it('on-an-island: 0 when opponent WR rating is 92', () =>
    expect(computeRollBonus('on-an-island', 5, { ...base, opponentWRRating: 92 })).toBe(0))
  it('on-an-island: 0 when rating is undefined', () =>
    expect(computeRollBonus('on-an-island', 5, { ...base, opponentWRRating: undefined })).toBe(0))
})

describe('computeRollBonus — QB', () => {
  it('play-action: +5 when previous play was run', () =>
    expect(computeRollBonus('play-action', 5, { ...base, ownPlayHistory: ['run'] })).toBe(5))
  it('play-action: 0 when previous play was pass', () =>
    expect(computeRollBonus('play-action', 5, { ...base, ownPlayHistory: ['pass'] })).toBe(0))
  it('play-action: 0 with empty history', () =>
    expect(computeRollBonus('play-action', 5, { ...base, ownPlayHistory: [] })).toBe(0))
  it('in-rhythm: +5 when previous play was pass', () =>
    expect(computeRollBonus('in-rhythm', 5, { ...base, ownPlayHistory: ['pass'] })).toBe(5))
  it('in-rhythm: 0 when previous play was run', () =>
    expect(computeRollBonus('in-rhythm', 5, { ...base, ownPlayHistory: ['run'] })).toBe(0))
})

describe('computeRollBonus — RB', () => {
  it('workhorse: +3 on first run (ownRunsThisDrive=0)', () =>
    expect(computeRollBonus('workhorse', 5, { ...base, playCall: 'run', ownRunsThisDrive: 0 })).toBe(3))
  it('workhorse: +9 on third run (ownRunsThisDrive=2)', () =>
    expect(computeRollBonus('workhorse', 5, { ...base, playCall: 'run', ownRunsThisDrive: 2 })).toBe(9))
  it('workhorse: 0 on pass play', () =>
    expect(computeRollBonus('workhorse', 5, { ...base, playCall: 'pass', ownRunsThisDrive: 3 })).toBe(0))
  it('fresh-legs: +8 on first down run', () =>
    expect(computeRollBonus('fresh-legs', 5, { ...base, down: 1, playCall: 'run' })).toBe(8))
  it('fresh-legs: 0 on second down run', () =>
    expect(computeRollBonus('fresh-legs', 5, { ...base, down: 2, playCall: 'run' })).toBe(0))
  it('fresh-legs: 0 on first down pass', () =>
    expect(computeRollBonus('fresh-legs', 5, { ...base, down: 1, playCall: 'pass' })).toBe(0))
  it('goal-line: +5 at driveProgress 80', () =>
    expect(computeRollBonus('goal-line', 5, { ...base, driveProgress: 80 })).toBe(5))
  it('goal-line: 0 at driveProgress 79', () =>
    expect(computeRollBonus('goal-line', 5, { ...base, driveProgress: 79 })).toBe(0))
})

describe('computeRollBonus — WR', () => {
  it('basketball-player: +5 at driveProgress 80', () =>
    expect(computeRollBonus('basketball-player', 5, { ...base, driveProgress: 80 })).toBe(5))
  it('basketball-player: 0 at driveProgress 79', () =>
    expect(computeRollBonus('basketball-player', 5, { ...base, driveProgress: 79 })).toBe(0))
  it('yac: +5 when wrYacActive', () =>
    expect(computeRollBonus('yac', 5, { ...base, wrYacActive: true })).toBe(5))
  it('yac: 0 when not active', () =>
    expect(computeRollBonus('yac', 5, { ...base, wrYacActive: false })).toBe(0))
})

describe('computeRollBonus — unknown id', () => {
  it('returns 0 for unknown ability', () =>
    expect(computeRollBonus('does-not-exist', 10, base)).toBe(0))
})

describe('defensive ability — stack-the-box sees offense history', () => {
  it('fires when oppPlayHistory has consecutive runs (as set by buildAbilityContext for defense)', () => {
    // When user is on offense running repeatedly, opponent DLine with stack-the-box
    // should fire. The ctx.oppPlayHistory for a defensive player must be the OFFENSE's history.
    const ctx: AbilityContext = {
      ...base,
      playerSide: 'defense',
      playCall: 'run',
      oppPlayHistory: ['run', 'run'],  // this is the OFFENSE's history (correct convention)
    }
    expect(computeRollBonus('stack-the-box', 5, ctx)).toBe(7)
  })

  it('does NOT fire when oppPlayHistory has the WRONG team (defender own history)', () => {
    // Simulates the old bug: defender's own past offensive runs in oppPlayHistory
    // should NOT trigger stack-the-box, which should see the current offense's runs
    const ctx: AbilityContext = {
      ...base,
      playerSide: 'defense',
      playCall: 'run',
      oppPlayHistory: [],  // offense hasn't run yet this drive
      ownPlayHistory: ['run', 'run'],  // defender's own PAST offensive runs
    }
    expect(computeRollBonus('stack-the-box', 5, ctx)).toBe(0)
  })
})

describe('computePostRollBonus — blessed', () => {
  it('blessed-evens: counts evens across all rolls', () => {
    const ctx = { ...base, allOffRolls: [10, 7, null] as (number|null)[], allDefRolls: [8, 9] as (number|null)[] }
    expect(computePostRollBonus('blessed-evens', ctx)).toBe(2)
  })
  it('blessed-odds: counts odds across all rolls', () => {
    const ctx = { ...base, allOffRolls: [10, 7] as (number|null)[], allDefRolls: [8, 9] as (number|null)[] }
    expect(computePostRollBonus('blessed-odds', ctx)).toBe(2)
  })
  it('blessed-evens: ignores null values', () => {
    const ctx = { ...base, allOffRolls: [null, null] as (number|null)[], allDefRolls: [null] as (number|null)[] }
    expect(computePostRollBonus('blessed-evens', ctx)).toBe(0)
  })
  it('returns 0 for unknown post-roll ability', () =>
    expect(computePostRollBonus('does-not-exist', base)).toBe(0))
})

describe('warming-up', () => {
  const baseCtx: AbilityContext = {
    quarter: 1, driveIndex: 0, possession: 'user', playerSide: 'offense',
    playerTeamIsLosing: false, isLastTeamDrive: false, driveProgress: 50,
    rzYard: 80, down: 1, playCall: 'run', weather: 'Clear',
    ownPlayHistory: [], oppPlayHistory: [], ownRunsThisDrive: 0,
    wrYacActive: false, olineRoll: null, opponentWRRating: undefined,
    allOffRolls: [], allDefRolls: [],
    downHistory: [], feedTheBeastBonus: 0, abilityCounter: 0,
  }
  it('returns -3 in quarter 1', () => {
    expect(computeRollBonus('warming-up', 8, { ...baseCtx, quarter: 1 })).toBe(-3)
  })
  it('returns -3 in quarter 2', () => {
    expect(computeRollBonus('warming-up', 8, { ...baseCtx, quarter: 2 })).toBe(-3)
  })
  it('returns +10 in quarter 3', () => {
    expect(computeRollBonus('warming-up', 8, { ...baseCtx, quarter: 3 })).toBe(10)
  })
  it('returns +10 in quarter 4', () => {
    expect(computeRollBonus('warming-up', 8, { ...baseCtx, quarter: 4 })).toBe(10)
  })
})

describe('elevate', () => {
  const baseCtx: AbilityContext = {
    quarter: 2, driveIndex: 2, possession: 'user', playerSide: 'offense',
    playerTeamIsLosing: false, isLastTeamDrive: false, driveProgress: 40,
    rzYard: 80, down: 2, playCall: 'pass', weather: 'Clear',
    ownPlayHistory: [], oppPlayHistory: [], ownRunsThisDrive: 0,
    wrYacActive: false, olineRoll: null, opponentWRRating: undefined,
    allOffRolls: [], allDefRolls: [],
    downHistory: [], feedTheBeastBonus: 0, abilityCounter: 0,
  }
  it('returns 0 when no opponent rolled 15+', () => {
    const ctx = { ...baseCtx, playerSide: 'offense' as const, allDefRolls: [10, 12] }
    expect(computePostRollBonus('elevate', ctx)).toBe(0)
  })
  it('returns +5 when an opponent raw roll is exactly 15', () => {
    const ctx = { ...baseCtx, playerSide: 'offense' as const, allDefRolls: [15, 8] }
    expect(computePostRollBonus('elevate', ctx)).toBe(5)
  })
  it('returns +5 when an opponent raw roll exceeds 15', () => {
    const ctx = { ...baseCtx, playerSide: 'defense' as const, allOffRolls: [16], allDefRolls: [] }
    expect(computePostRollBonus('elevate', ctx)).toBe(5)
  })
  it('returns 0 when holding side is offense and no defender rolled 15+', () => {
    const ctx = { ...baseCtx, playerSide: 'offense' as const, allDefRolls: [14] }
    expect(computePostRollBonus('elevate', ctx)).toBe(0)
  })
})
