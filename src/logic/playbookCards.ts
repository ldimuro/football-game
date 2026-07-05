import { rng } from './rng'
import type { PlaybookCard, PlaybookCardId, CardYardsContext } from '../types'

export const CARDS: Record<PlaybookCardId, PlaybookCard> = {
  'dive': {
    id: 'dive',
    name: 'Dive',
    description: 'RB + OLine. Straight ahead, no frills.',
    playType: 'run',
    mechanic: 'vanilla',
  },
  'quick-pass': {
    id: 'quick-pass',
    name: 'Quick Pass',
    description: 'QB + OLine + WR. Standard pass play.',
    playType: 'pass',
    mechanic: 'vanilla',
  },
  'off-tackle': {
    id: 'off-tackle',
    name: 'Off Tackle',
    description: 'RB rolls twice, keep lower. Guaranteed non-negative yards.',
    playType: 'run',
    mechanic: 'off-tackle',
  },
  'power-run': {
    id: 'power-run',
    name: 'Power Run',
    description: 'RB rolls twice, keep higher. OLine rolls normally.',
    playType: 'run',
    mechanic: 'power-run',
  },
  'ground-and-pound': {
    id: 'ground-and-pound',
    name: 'Ground & Pound',
    description: 'RB + OLine. +3 per prior run this drive (max +12).',
    playType: 'run',
    mechanic: 'ramp-run',
  },
  'play-action': {
    id: 'play-action',
    name: 'Play Action',
    description: 'QB + OLine + WR. +8 bonus if previous play was a run.',
    playType: 'pass',
    mechanic: 'play-action-bonus',
  },
  'double-move': {
    id: 'double-move',
    name: 'Double Move',
    description: 'QB + OLine + WR. WR rolls twice, keep higher.',
    playType: 'pass',
    mechanic: 'double-move',
  },
  'checkdown': {
    id: 'checkdown',
    name: 'Checkdown',
    description: 'QB + OLine + WR. WR uses floor value. Turnover-immune.',
    playType: 'pass',
    mechanic: 'checkdown',
  },
  'deep-shot': {
    id: 'deep-shot',
    name: 'Deep Shot',
    description: 'WR rolls solo. If ≥14: full value vs no defense. If not: OLine vs DLine.',
    playType: 'pass',
    mechanic: 'threshold-shot',
  },
  'hail-mary': {
    id: 'hail-mary',
    name: 'Hail Mary',
    description: 'QB + OLine + WR. If QB ≥16: offense×2. Otherwise: 0 yards.',
    playType: 'pass',
    mechanic: 'hail-mary',
  },
}

const DECK_WEIGHTS: { card: PlaybookCard; weight: number }[] = [
  { card: CARDS['dive'],             weight: 3 },
  { card: CARDS['quick-pass'],       weight: 3 },
  { card: CARDS['off-tackle'],       weight: 1 },
  { card: CARDS['power-run'],        weight: 1 },
  { card: CARDS['ground-and-pound'], weight: 1 },
  { card: CARDS['play-action'],      weight: 1 },
  { card: CARDS['double-move'],      weight: 1 },
  { card: CARDS['checkdown'],        weight: 1 },
  { card: CARDS['deep-shot'],        weight: 1 },
  { card: CARDS['hail-mary'],        weight: 1 },
]

const TOTAL_WEIGHT = DECK_WEIGHTS.reduce((sum, { weight }) => sum + weight, 0) // 14

export function drawHand(n: number): PlaybookCard[] {
  const hand: PlaybookCard[] = []
  for (let i = 0; i < n; i++) {
    let r = rng() * TOTAL_WEIGHT
    for (const { card, weight } of DECK_WEIGHTS) {
      r -= weight
      if (r <= 0) {
        hand.push(card)
        break
      }
    }
  }
  return hand
}

export function applyCardYards(
  card: PlaybookCard | null,
  offTotal: number,
  defTotal: number,
  advantageBonus: number,
  ctx: CardYardsContext,
): { yards: number; cardBonus: number } {
  const baseYards = offTotal - defTotal + advantageBonus
  if (!card) return { yards: baseYards, cardBonus: 0 }

  switch (card.mechanic) {
    case 'off-tackle':
      return { yards: Math.max(0, baseYards), cardBonus: 0 }
    case 'ramp-run': {
      const bonus = Math.min(12, 3 * ctx.runsThisDrive)
      return { yards: baseYards + bonus, cardBonus: bonus }
    }
    case 'play-action-bonus': {
      const bonus = ctx.prevPlayCall === 'run' ? 8 : 0
      return { yards: baseYards + bonus, cardBonus: bonus }
    }
    case 'hail-mary': {
      if (ctx.qbRoll >= 16) {
        return { yards: offTotal * 2 - defTotal + advantageBonus, cardBonus: offTotal }
      }
      // Failed: yards=0; cardBonus is the negative adjustment to make the breakdown sum to 0
      return { yards: 0, cardBonus: -baseYards }
    }
    default:
      return { yards: baseYards, cardBonus: 0 }
  }
}
