import type { WeatherCondition } from '../types'

export interface AbilityContext {
  quarter: number
  driveIndex: number
  possession: 'user' | 'opponent'
  playerSide: 'offense' | 'defense'
  playerTeamIsLosing: boolean
  isLastTeamDrive: boolean
  driveProgress: number
  down: number
  playCall: 'run' | 'pass'
  weather: WeatherCondition
  ownPlayHistory: ('run' | 'pass')[]
  oppPlayHistory: ('run' | 'pass')[]
  ownRunsThisDrive: number
  wrYacActive: boolean
  olineRoll: number | null
  opponentWRRating: number | undefined
  allOffRolls: (number | null)[]
  allDefRolls: (number | null)[]
}

export const ABILITY_DISPLAY: Record<string, string> = {
  'evens':             '2️⃣ Evens',
  'odds':              '3️⃣ Odds',
  'evil-evens':        '2️⃣ Evil Evens',
  'evil-odds':         '3️⃣ Evil Odds',
  'blessed-evens':     '2️⃣ Blessed Evens',
  'blessed-odds':      '3️⃣ Blessed Odds',
  'second-half':       '💪🏻 2nd-Half Player',
  'clutch':            '💪🏻 Clutch',
  'rain-man':          '🌧️ Rain Man',
  'snow-man':          '❄️ Snow Man',
  'comeback-kid':      '📈 Comeback Kid',
  'two-minute-drill':  '⏱️ Two Minute Drill',
  'air-raid':          '✈️ Air Raid',
  'ground-and-pound':  '👊 Ground and Pound',
  'psychic':           '🔮 Psychic',
  'bull-rush':         '🐂 Bull Rush',
  'brick-wall':        '🧱 Brick Wall',
  'stack-the-box':     '📦 Stack the Box',
  'bend-dont-break':   "⛓️ Bend Don't Break",
  'on-an-island':      '🏝️ On an Island',
  'no-fly-zone':       '❌ No Fly Zone',
  'play-action':       '🏈 Play Action',
  'in-rhythm':         '🎵 In Rhythm',
  'workhorse':         '🐴 Workhorse',
  'fresh-legs':        '🦵 Fresh Legs',
  'goal-line':         '🏈 Goal Line',
  'basketball-player': '🏀 Basketball Player',
  'yac':               '🏈 YAC',
}

const POST_ROLL_ABILITIES = new Set(['blessed-evens', 'blessed-odds'])

export function isPostRollAbility(abilityId: string): boolean {
  return POST_ROLL_ABILITIES.has(abilityId)
}

function consecutiveCount(history: ('run' | 'pass')[], current: 'run' | 'pass'): number {
  let count = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] === current) count++
    else break
  }
  return count + 1  // +1 for the current play
}

function consecutiveBonus(count: number): number {
  return count >= 2 ? 5 + 2 * (count - 2) : 0
}

export function computeRollBonus(abilityId: string, roll: number, ctx: AbilityContext): number {
  switch (abilityId) {
    case 'evens':            return roll % 2 === 0 ? 5 : 0
    case 'odds':             return roll % 2 !== 0 ? 5 : 0
    case 'evil-evens':       return roll % 2 === 0 ? 7 : -3
    case 'evil-odds':        return roll % 2 !== 0 ? 7 : -3
    case 'second-half':      return ctx.quarter >= 3 ? 5 : 0
    case 'clutch':           return ctx.quarter === 4 ? 10 : 0
    case 'rain-man':         return ctx.weather === 'Rain' ? 5 : 0
    case 'snow-man':         return ctx.weather === 'Snow' ? 5 : 0
    case 'comeback-kid':     return ctx.playerTeamIsLosing ? 5 : 0
    case 'two-minute-drill': return ctx.playerSide === 'offense' && ctx.isLastTeamDrive ? 15 : 0
    case 'air-raid':         return ctx.playCall === 'pass' ? 5 : 0
    case 'ground-and-pound': return ctx.playCall === 'run' ? 5 : 0
    case 'psychic': {
      const history = ctx.playerSide === 'offense' ? ctx.ownPlayHistory : ctx.oppPlayHistory
      return consecutiveBonus(consecutiveCount(history, ctx.playCall))
    }
    case 'bull-rush':
      return ctx.playCall === 'pass' && ctx.olineRoll !== null && ctx.olineRoll <= roll ? 7 : 0
    case 'brick-wall':
      return ctx.playCall === 'run' && ctx.olineRoll !== null && ctx.olineRoll <= roll ? 7 : 0
    case 'stack-the-box':
      return ctx.playCall === 'run'
        ? consecutiveBonus(consecutiveCount(ctx.oppPlayHistory, 'run'))
        : 0
    case 'no-fly-zone':
      return ctx.playCall === 'pass'
        ? consecutiveBonus(consecutiveCount(ctx.oppPlayHistory, 'pass'))
        : 0
    case 'bend-dont-break':  return ctx.driveProgress >= 80 ? 5 : 0
    case 'on-an-island':     return (ctx.opponentWRRating ?? 0) >= 93 ? 5 : 0
    case 'play-action':      return ctx.ownPlayHistory.at(-1) === 'run' ? 5 : 0
    case 'in-rhythm':        return ctx.ownPlayHistory.at(-1) === 'pass' ? 5 : 0
    case 'workhorse':        return ctx.playCall === 'run' ? (ctx.ownRunsThisDrive + 1) * 3 : 0
    case 'fresh-legs':       return ctx.down === 1 && ctx.playCall === 'run' ? 8 : 0
    case 'goal-line':        return ctx.driveProgress >= 80 ? 5 : 0
    case 'basketball-player':return ctx.driveProgress >= 80 ? 5 : 0
    case 'yac':              return ctx.wrYacActive ? 5 : 0
    default:                 return 0
  }
}

export function computePostRollBonus(abilityId: string, ctx: AbilityContext): number {
  const rolls = [...ctx.allOffRolls, ...ctx.allDefRolls].filter((r): r is number => r !== null)
  switch (abilityId) {
    case 'blessed-evens': return rolls.filter(r => r % 2 === 0).length
    case 'blessed-odds':  return rolls.filter(r => r % 2 !== 0).length
    default:              return 0
  }
}
