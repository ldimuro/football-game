// src/logic/gameEngine.ts
import type { Roster, Player, TeamUnit } from '../types'
import {
  ADVANTAGE_BONUS,
  FG_RANGE_YARD,
  FG_DIFFICULTY_MAX,
  FG_DIFFICULTY_MIN,
  TD_YARD,
} from './gameConstants'

const FALLBACK_DIE = [5, 5, 5, 5, 5, 5]

export function getPlayerDie(player: Player | TeamUnit): number[] {
  return player.die && player.die.length > 0 ? player.die : FALLBACK_DIE
}

export function rollDie(die: number[]): number {
  if (die.length === 0) return FALLBACK_DIE[0]
  return die[Math.floor(Math.random() * die.length)]
}

export function computeAdvantageBonus(
  offCall: 'run' | 'pass',
  defCall: 'run-stop' | 'pass-stop',
): number {
  const defCorrect =
    (offCall === 'run' && defCall === 'run-stop') ||
    (offCall === 'pass' && defCall === 'pass-stop')
  return defCorrect ? -ADVANTAGE_BONUS : ADVANTAGE_BONUS
}

export function computeYardsGained(
  offRolls: number[],
  defRolls: number[],
  bonus: number,
): number {
  const offSum = offRolls.reduce((a, b) => a + b, 0)
  const defSum = defRolls.reduce((a, b) => a + b, 0)
  return offSum - defSum + bonus
}

export function computeFGDifficulty(progress: number, fgRangeYard = FG_RANGE_YARD, tdYard = TD_YARD): number {
  const yardRange = (tdYard - 1) - fgRangeYard
  return Math.min(
    FG_DIFFICULTY_MAX,
    Math.max(
      FG_DIFFICULTY_MIN,
      Math.round(FG_DIFFICULTY_MAX - ((progress - fgRangeYard) / yardRange) * (FG_DIFFICULTY_MAX - FG_DIFFICULTY_MIN)),
    ),
  )
}

export function getOffensePlayers(
  roster: Roster,
  play: 'run' | 'pass',
  wr: 'WR1' | 'WR2',
): (Player | TeamUnit)[] {
  if (play === 'run') {
    return [roster.RB, roster.OLine].filter(Boolean) as (Player | TeamUnit)[]
  }
  const wrPlayer = wr === 'WR1' ? roster.WR1 : roster.WR2
  return [roster.QB, roster.OLine, wrPlayer].filter(Boolean) as (Player | TeamUnit)[]
}

export function getDefensePlayers(
  roster: Roster,
  play: 'run' | 'pass',
): (Player | TeamUnit)[] {
  if (play === 'run') {
    return [roster.DLine].filter(Boolean) as (Player | TeamUnit)[]
  }
  return [roster.DLine, roster.Secondary].filter(Boolean) as (Player | TeamUnit)[]
}
