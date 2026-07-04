import { ENABLED_LEAGUE_RULES } from './gameConstants'
import { rng } from './rng'

export interface LeagueRule {
  id: string
  emoji: string
  name: string
  description: string
}

export interface RuleOverrides {
  tdPoints: number
  fgPoints: number
  tdYard: number
  fgRangeYard: number
  rzYard: number
  maxDowns: number
  noPuntingRule: boolean
  pick2Rule: boolean
  iceAge: boolean
  dualTurnoverNumbers: boolean
}

export const LEAGUE_RULES: LeagueRule[] = [
  { id: 'rz-starts-at-35',    emoji: '🔴', name: 'RZ Starts at 65',               description: 'The Red Zone begins at the 65 yd line — red zone abilities activate much earlier.' },
  { id: 'field-125',          emoji: '🌎', name: 'Field becomes 125 yards',        description: 'The field extends to 125 yards. Drives need 105 yards to score a TD.' },
  { id: 'altitude',           emoji: '🏔️', name: 'Altitude',                       description: 'Thin air extends FG range to the 50 yd line.' },
  { id: 'kickers-people',     emoji: '🦶', name: 'Kickers are People, Too',        description: 'Field goals are worth 6 points.' },
  { id: 'no-punting',         emoji: '❌', name: 'No Punting',                     description: 'Failed 4th downs turn the ball over at the spot instead of punting to the 20.' },
  { id: 'fifth-down',         emoji: '5️⃣', name: '5th Down',                       description: 'The offense gets a 5th down per drive.' },
  { id: 'ice-age',            emoji: '❄️', name: 'Ice Age',                        description: 'Every game this season is played in the snow.' },
  { id: 'defense-wins',       emoji: '🛡️', name: 'Defense Wins Championships',    description: 'Each team starts with 2 Turnover Numbers — rolling either triggers a turnover.' },
  { id: 'pick-2',             emoji: '🏈', name: 'Pick-2',                         description: 'Turnovers score 2 points for the defending team.' },
  { id: 'parallel-universe',  emoji: '🪐', name: 'Parallel Universe',              description: 'FGs are worth 7 points and TDs are worth 3 points.' },
]

export function getDefaultOverrides(): RuleOverrides {
  return {
    tdPoints: 7,
    fgPoints: 3,
    tdYard: 100,
    fgRangeYard: 60,
    rzYard: 80,
    maxDowns: 4,
    noPuntingRule: false,
    pick2Rule: false,
    iceAge: false,
    dualTurnoverNumbers: false,
  }
}

export function getRuleOverrides(rule: LeagueRule): RuleOverrides {
  const d = getDefaultOverrides()
  switch (rule.id) {
    case 'rz-starts-at-35':   return { ...d, rzYard: 65 }
    case 'field-125':         return { ...d, tdYard: 125 }
    case 'altitude':          return { ...d, fgRangeYard: 50 }
    case 'kickers-people':    return { ...d, fgPoints: 6 }
    case 'no-punting':        return { ...d, noPuntingRule: true }
    case 'fifth-down':        return { ...d, maxDowns: 5 }
    case 'ice-age':           return { ...d, iceAge: true }
    case 'defense-wins':      return { ...d, dualTurnoverNumbers: true }
    case 'pick-2':            return { ...d, pick2Rule: true }
    case 'parallel-universe': return { ...d, tdPoints: 3, fgPoints: 7 }
    default:                  return d
  }
}

export function getRandomRule(): LeagueRule | null {
  const pool = LEAGUE_RULES.filter(r => ENABLED_LEAGUE_RULES.has(r.id))
  if (pool.length === 0) return null
  return pool[Math.floor(rng() * pool.length)]
}
