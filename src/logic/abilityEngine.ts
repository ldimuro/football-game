import type { WeatherCondition } from '../types'

export type AbilityRarity = 'Common' | 'Uncommon' | 'Rare'

export const ABILITY_RARITY: Record<string, AbilityRarity> = {
  'evens':             'Common',
  'odds':              'Common',
  'evil-evens':        'Common',
  'evil-odds':         'Common',
  'blessed-evens':     'Common',
  'blessed-odds':      'Common',
  'second-half':       'Common',
  'clutch':            'Common',
  'rain-man':          'Common',
  'snow-man':          'Common',
  'comeback-kid':      'Common',
  'two-minute-drill':  'Common',
  'air-raid':          'Common',
  'ground-and-pound':  'Common',
  'psychic':           'Common',
  'bull-rush':         'Common',
  'brick-wall':        'Common',
  'stack-the-box':     'Common',
  'bend-dont-break':   'Common',
  'on-an-island':      'Common',
  'no-fly-zone':       'Common',
  'play-action':       'Common',
  'in-rhythm':         'Common',
  'workhorse':         'Common',
  'fresh-legs':        'Common',
  'goal-line':         'Common',
  'basketball-player': 'Common',
  'yac':               'Common',
  'warming-up':        'Common',
  'elevate':           'Common',
  'long-leg':          'Common',
  'money-ball':        'Common',
  'absorb':            'Common',
  'td-merchant':       'Common',
  'to-merchant':       'Common',
  'patience-qb':       'Common',
  'patience-rb':       'Common',
  'patience-wr':       'Common',
  'feed-the-beast-rb': 'Common',
  'feed-the-beast-wr': 'Common',
  'dual-threat-qb':    'Common',
  'dual-threat-rb':    'Common',
}

export interface AbilityContext {
  quarter: number
  driveIndex: number
  possession: 'user' | 'opponent'
  playerSide: 'offense' | 'defense'
  playerTeamIsLosing: boolean
  isLastTeamDrive: boolean
  driveProgress: number
  rzYard: number
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
  downHistory: { playCall: 'run' | 'pass'; yardsGained: number }[]
  feedTheBeastBonus: number
  abilityCounter: number
}

export const ABILITY_DESCRIPTIONS: Record<string, string> = {
  'evens':             '+5 on even rolls',
  'odds':              '+5 on odd rolls',
  'evil-evens':        '+7 on even rolls, −3 on odd rolls',
  'evil-odds':         '+7 on odd rolls, −3 on even rolls',
  'blessed-evens':     '+1 for each even roll made by anyone this play (applied after all rolls)',
  'blessed-odds':      '+1 for each odd roll made by anyone this play (applied after all rolls)',
  'second-half':       '+5 in the 3rd and 4th quarters',
  'clutch':            '+10 in the 4th quarter',
  'rain-man':          '+5 during rain games',
  'snow-man':          '+5 during snow games',
  'comeback-kid':      '+5 when your team is losing',
  'two-minute-drill':  '+15 on the last offensive drive of each half',
  'air-raid':          '+5 on every pass play',
  'ground-and-pound':  '+5 on every run play',
  'psychic':           '+5 when the opponent repeats the same play type; +2 more per additional repeat',
  'bull-rush':         '+7 on pass plays when this roll beats the O-Line',
  'brick-wall':        '+7 on run plays when this roll beats the O-Line',
  'stack-the-box':     '+5 when the offense repeats a run play; +2 more each additional repeat',
  'bend-dont-break':   '+5 when the offense is in the red zone',
  'on-an-island':      '+5 when matched against an elite WR (93+ rating)',
  'no-fly-zone':       '+5 when the offense repeats a pass play; +2 more each additional repeat',
  'play-action':       '+5 on pass plays when the previous play was a run',
  'in-rhythm':         '+5 on pass plays when the previous play was also a pass',
  'workhorse':         '+3 × rushes already called this drive (grows with usage)',
  'fresh-legs':        '+8 on 1st-down run plays',
  'goal-line':         '+5 when in the red zone',
  'basketball-player': '+5 when in the red zone',
  'yac':               '+5 on every roll this drive after scoring 12+ on any roll',
  'warming-up':        '−3 in the 1st Half; +10 in the 2nd Half',
  'elevate':           '+5 if any opponent rolls 15+ (raw die) during the play',
  'long-leg':          'FG range extended by 5 yards',
  'money-ball':        'FGs scored from the Red Zone are worth 5 points',
  'absorb':            '+1 each time you roll your target number (1–20) — stacks immediately per roll and persists across the season',
  'td-merchant':       '+1 for every offensive TD your team scores in the season',
  'to-merchant':       '+1 for every defensive turnover your team forces in the season',
  'patience-qb':       '+15 on 4th Down if the first 3 downs of the drive were run plays',
  'patience-rb':       '+15 on 4th Down if the first 3 downs of the drive were pass plays',
  'patience-wr':       '+10 on 4th Down if the first 3 downs of the drive were run plays',
  'feed-the-beast-rb': '+5 (stacking) for each drive where the RB played every down; bonus persists for the game',
  'feed-the-beast-wr': '+5 (stacking) for each drive where this WR played every down; bonus persists for the game',
  'dual-threat-qb':    'QB can be selected in place of the RB on Run plays',
  'dual-threat-rb':    'RB can be selected in place of a WR on Pass plays',
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
  'warming-up':        '🔥 Warming Up',
  'elevate':           '⬆️ Elevate',
  'long-leg':          '🦵 Long Leg',
  'money-ball':        '💰 Money Ball',
  'absorb':            '🧽 Absorb',
  'td-merchant':       '💰 TD Merchant',
  'to-merchant':       '💰 TO Merchant',
  'patience-qb':       '🧘 Patience',
  'patience-rb':       '🧘 Patience',
  'patience-wr':       '🧘 Patience',
  'feed-the-beast-rb': '👹 Feed the Beast',
  'feed-the-beast-wr': '👹 Feed the Beast',
  'dual-threat-qb':    '2️⃣ Dual Threat',
  'dual-threat-rb':    '2️⃣ Dual Threat',
}

const POST_ROLL_ABILITIES = new Set(['blessed-evens', 'blessed-odds', 'elevate'])

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
      return consecutiveBonus(consecutiveCount(ctx.oppPlayHistory, ctx.playCall))
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
    case 'bend-dont-break':  return ctx.driveProgress >= ctx.rzYard ? 5 : 0
    case 'on-an-island':     return (ctx.opponentWRRating ?? 0) >= 93 ? 5 : 0
    case 'play-action':      return ctx.ownPlayHistory.at(-1) === 'run' ? 5 : 0
    case 'in-rhythm':        return ctx.ownPlayHistory.at(-1) === 'pass' ? 5 : 0
    case 'workhorse':        return ctx.playCall === 'run' ? (ctx.ownRunsThisDrive + 1) * 3 : 0
    case 'fresh-legs':       return ctx.down === 1 && ctx.playCall === 'run' ? 8 : 0
    case 'goal-line':        return ctx.driveProgress >= ctx.rzYard ? 5 : 0
    case 'basketball-player':return ctx.driveProgress >= ctx.rzYard ? 5 : 0
    case 'yac':              return ctx.wrYacActive ? 5 : 0
    case 'warming-up': return ctx.quarter <= 2 ? -3 : 10
    case 'absorb':           return ctx.abilityCounter
    case 'td-merchant':      return ctx.abilityCounter
    case 'to-merchant':      return ctx.abilityCounter
    case 'patience-qb':
      return (ctx.down === 4 && ctx.downHistory.length === 3
        && ctx.downHistory.every(e => e.playCall === 'run')) ? 15 : 0
    case 'patience-rb':
      return (ctx.down === 4 && ctx.downHistory.length === 3
        && ctx.downHistory.every(e => e.playCall === 'pass')) ? 15 : 0
    case 'patience-wr':
      return (ctx.down === 4 && ctx.downHistory.length === 3
        && ctx.downHistory.every(e => e.playCall === 'run')) ? 10 : 0
    case 'feed-the-beast-rb':  return ctx.feedTheBeastBonus
    case 'feed-the-beast-wr':  return ctx.feedTheBeastBonus
    case 'long-leg':           return 0  // handled in GameScreen
    case 'money-ball':         return 0  // handled in GameScreen
    case 'dual-threat-qb':     return 0  // handled in GameScreen
    case 'dual-threat-rb':     return 0  // handled in GameScreen
    default:                 return 0
  }
}

export function getAbilityDisplayName(abilityId: string, abilityTarget?: number): string {
  const base = ABILITY_DISPLAY[abilityId] ?? abilityId
  if (abilityId === 'absorb' && abilityTarget !== undefined) {
    const [emoji, ...words] = base.split(' ')
    return `${emoji} ${words.join(' ')} (${abilityTarget})`
  }
  return base
}

export function getAbilityTooltipDescription(
  abilityId: string,
  abilityTarget?: number,
  abilityCounter?: number,
): string {
  if (abilityId === 'absorb' && abilityTarget !== undefined) {
    return `+1 for rolling a ${abilityTarget} (${abilityCounter ?? 0} this season)`
  }
  const base = ABILITY_DESCRIPTIONS[abilityId] ?? abilityId
  if (abilityCounter !== undefined && abilityCounter > 0) {
    return `${base} (${abilityCounter})`
  }
  return base
}

export function computePostRollBonus(abilityId: string, ctx: AbilityContext): number {
  const rolls = [...ctx.allOffRolls, ...ctx.allDefRolls].filter((r): r is number => r !== null)
  switch (abilityId) {
    case 'blessed-evens': return rolls.filter(r => r % 2 === 0).length
    case 'blessed-odds':  return rolls.filter(r => r % 2 !== 0).length
    case 'elevate': {
      const opponentRolls = ctx.playerSide === 'offense'
        ? ctx.allDefRolls.filter((r): r is number => r !== null)
        : ctx.allOffRolls.filter((r): r is number => r !== null)
      return opponentRolls.some(r => r >= 15) ? 5 : 0
    }
    default:              return 0
  }
}
