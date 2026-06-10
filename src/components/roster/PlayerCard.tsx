import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { StatBar } from '../ui/StatBar'
import { getTeamColor } from '../../logic/teamColors'
import { rankColorClass, statColorClass } from '../../logic/statColors'
import type { Player, TeamUnit, RosterPosition, QBStats, WRStats, RBStats, KStats, OLineStats, DLineStats, SecondaryStats } from '../../types'

interface PlayerCardProps {
  slot: Player | TeamUnit
  position: RosterPosition
  onReroll?: () => void
  rerollsRemaining?: number
  coinValue?: number
  onSell?: () => void
}

const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

export function renderStats(slot: Player | TeamUnit) {
  const s = slot.stats
  const { year, position } = slot
  const c = (field: string, value: number | null) => statColorClass(year, position, field, value)

  if ('passYPG' in s) {
    const q = s as QBStats
    return (
      <>
        <StatBar label="Pass YPG" value={q.passYPG.toFixed(1)} valueClassName={c('passYPG', q.passYPG)} />
        <StatBar label="Completion%" value={(q.completionPct * 100).toFixed(1) + '%'} valueClassName={c('completionPct', q.completionPct)} />
        <StatBar label="Avg TD/G" value={q.avgTDPerGame.toFixed(2)} valueClassName={c('avgTDPerGame', q.avgTDPerGame)} />
        <StatBar label="Avg INT/G" value={q.avgINTPerGame.toFixed(2)} valueClassName={c('avgINTPerGame', q.avgINTPerGame)} />
        <StatBar label="QBR" value={q.qbr.toFixed(1)} valueClassName={c('qbr', q.qbr)} />
      </>
    )
  }
  if ('rushYPG' in s) {
    const r = s as RBStats
    return (
      <>
        <StatBar label="Rush YPG" value={r.rushYPG.toFixed(1)} valueClassName={c('rushYPG', r.rushYPG)} />
        <StatBar label="Rec YPG" value={r.recYPG.toFixed(1)} valueClassName={c('recYPG', r.recYPG)} />
        <StatBar label="TDs/Game" value={r.tdPerGame.toFixed(2)} valueClassName={c('tdPerGame', r.tdPerGame)} />
        <StatBar label="Rush Att/G" value={r.rushAttPerGame.toFixed(1)} valueClassName={c('rushAttPerGame', r.rushAttPerGame)} />
      </>
    )
  }
  if ('recYPG' in s) {
    const w = s as WRStats
    return (
      <>
        <StatBar label="Rec YPG" value={w.recYPG.toFixed(1)} valueClassName={c('recYPG', w.recYPG)} />
        <StatBar label="TDs/Game" value={w.tdPerGame.toFixed(2)} valueClassName={c('tdPerGame', w.tdPerGame)} />
        <StatBar label="Avg Targets/G" value={w.avgTargetsPerGame === null ? '-' : w.avgTargetsPerGame.toFixed(1)} valueClassName={c('avgTargetsPerGame', w.avgTargetsPerGame)} />
        <StatBar label="Avg Catches/G" value={w.avgCatchesPerGame.toFixed(1)} valueClassName={c('avgCatchesPerGame', w.avgCatchesPerGame)} />
      </>
    )
  }
  if ('fgAccuracy' in s) {
    const k = s as KStats
    return (
      <>
        <StatBar label="FG Accuracy" value={(k.fgAccuracy * 100).toFixed(1) + '%'} valueClassName={c('fgAccuracy', k.fgAccuracy)} />
        <StatBar label="Avg Kick Distance" value={k.avgKickDistance.toFixed(1)} valueClassName={c('avgKickDistance', k.avgKickDistance)} />
        <StatBar label="Avg Miss Distance" value={k.avgMissDistance.toFixed(1)} valueClassName={c('avgMissDistance', k.avgMissDistance)} />
        <StatBar label="Longest Made Kick" value={k.longestMadeKick} valueClassName={c('longestMadeKick', k.longestMadeKick)} />
      </>
    )
  }
  if ('sacksAllowedPerGame' in s) {
    const o = s as OLineStats
    return (
      <>
        <StatBar label="Sacks Allowed/G" value={o.sacksAllowedPerGame.toFixed(1)} valueClassName={c('sacksAllowedPerGame', o.sacksAllowedPerGame)} />
        <StatBar label="Rush YPC" value={o.rushYPC.toFixed(1)} valueClassName={c('rushYPC', o.rushYPC)} />
        <StatBar label="Rush TD%" value={(o.rushTDPct * 100).toFixed(1) + '%'} valueClassName={c('rushTDPct', o.rushTDPct)} />
        <StatBar label="Rank" value={`#${o.normalizedRank}`} valueClassName={rankColorClass(o.normalizedRank)} />
      </>
    )
  }
  if ('sackPct' in s) {
    const d = s as DLineStats
    return (
      <>
        <StatBar label="Rush YPC Allowed" value={d.rushYPCAllowed.toFixed(1)} valueClassName={c('rushYPCAllowed', d.rushYPCAllowed)} />
        <StatBar label="Rush YPG Allowed" value={d.rushYPGAllowed.toFixed(1)} valueClassName={c('rushYPGAllowed', d.rushYPGAllowed)} />
        <StatBar label="Rush TD/G Allowed" value={d.rushTDPerGameAllowed.toFixed(2)} valueClassName={c('rushTDPerGameAllowed', d.rushTDPerGameAllowed)} />
        <StatBar label="Sack%" value={(d.sackPct * 100).toFixed(1) + '%'} valueClassName={c('sackPct', d.sackPct)} />
        <StatBar label="Blitz%" value={d.blitzPct === null ? '-' : (d.blitzPct * 100).toFixed(1) + '%'} valueClassName={c('blitzPct', d.blitzPct)} />
        <StatBar label="Pressure%" value={d.pressurePct === null ? '-' : (d.pressurePct * 100).toFixed(1) + '%'} valueClassName={c('pressurePct', d.pressurePct)} />
        <StatBar label="Rank" value={`#${d.normalizedRank}`} valueClassName={rankColorClass(d.normalizedRank)} />
      </>
    )
  }
  const sec = s as SecondaryStats
  return (
    <>
      <StatBar label="Comp% Allowed" value={(sec.completionPctAllowed * 100).toFixed(1) + '%'} valueClassName={c('completionPctAllowed', sec.completionPctAllowed)} />
      <StatBar label="Yds/Att Allowed" value={sec.yardsPerAttemptAllowed.toFixed(1)} valueClassName={c('yardsPerAttemptAllowed', sec.yardsPerAttemptAllowed)} />
      <StatBar label="Pass YPG Allowed" value={sec.passYPGAllowed.toFixed(1)} valueClassName={c('passYPGAllowed', sec.passYPGAllowed)} />
      <StatBar label="Pass TD/G Allowed" value={sec.passTDPerGameAllowed.toFixed(2)} valueClassName={c('passTDPerGameAllowed', sec.passTDPerGameAllowed)} />
      <StatBar label="INTs/G" value={sec.interceptionsPerGame.toFixed(2)} valueClassName={c('interceptionsPerGame', sec.interceptionsPerGame)} />
      <StatBar label="Rank" value={`#${sec.normalizedRank}`} valueClassName={rankColorClass(sec.normalizedRank)} />
    </>
  )
}

function ratingTier(r: number): { className: string } {
  if (r >= 98) return { className: 'text-yellow-400 font-black' }
  if (r >= 93) return { className: 'text-purple-400 font-bold' }
  if (r >= 85) return { className: 'text-green-400 font-bold' }
  if (r >= 75) return { className: 'text-blue-400 font-semibold' }
  if (r >= 65) return { className: 'text-gray-400 font-semibold' }
  return               { className: 'text-gray-500 font-semibold' }
}

export function PlayerCard({ slot, position, onReroll, rerollsRemaining = 0, coinValue, onSell }: PlayerCardProps) {
  const isUnit = 'position' in slot && !('name' in slot)
  const name = 'name' in slot ? slot.name : `${slot.team} ${POSITION_LABELS[position]}`
  const isAllPro = 'is_all_pro' in slot && slot.is_all_pro
  const isAwardWinner = ('is_mvp' in slot && slot.is_mvp) || ('is_opy' in slot && slot.is_opy) || ('is_dpy' in slot && slot.is_dpy)
  const rating = slot.rating
  const tier = rating !== undefined ? ratingTier(rating) : null

  return (
    <div
      className={`border-2 rounded-xl p-4 flex flex-col gap-3 ${isAwardWinner ? 'bg-yellow-400/20' : 'bg-white dark:bg-gray-900'}`}
      style={{ borderColor: getTeamColor(slot.team) }}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            {POSITION_LABELS[position]}
          </span>
          <p className="text-gray-900 dark:text-white font-semibold mt-0.5">{name}{isAllPro && ' ⭐️'}</p>
          <div className="flex gap-1 mt-1">
            <Badge label={slot.team} />
            <Badge label={String(slot.year)} color="blue" />
            {isUnit && <Badge label="Unit" color="gray" />}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {tier && (
            <div className="text-right">
              <span className={`text-2xl leading-none ${tier.className}`}>{rating}</span>
            </div>
          )}
          {coinValue !== undefined && (
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-500 text-white text-xs font-bold tabular-nums">
              {coinValue}
            </span>
          )}
          {onReroll && (
            <Button
              onClick={onReroll}
              variant="ghost"
              disabled={rerollsRemaining <= 0}
              className="text-xs"
            >
              Re-roll
            </Button>
          )}
          {onSell && (
            <button
              onClick={onSell}
              className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors px-1 py-0.5 rounded"
            >
              Sell
            </button>
          )}
        </div>
      </div>
      <div>{renderStats(slot)}</div>
    </div>
  )
}
