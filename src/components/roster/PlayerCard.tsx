import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { StatBar } from '../ui/StatBar'
import { getTeamColor } from '../../logic/teamColors'
import type { Player, TeamUnit, RosterPosition, QBStats, WRStats, RBStats, KStats, OLineStats, DLineStats, SecondaryStats } from '../../types'

interface PlayerCardProps {
  slot: Player | TeamUnit
  position: RosterPosition
  onReroll?: () => void
  rerollsRemaining?: number
}

const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

function renderStats(slot: Player | TeamUnit) {
  const s = slot.stats
  if ('passYPG' in s) {
    const q = s as QBStats
    return (
      <>
        <StatBar label="Pass YPG" value={q.passYPG.toFixed(1)} />
        <StatBar label="TD Ratio" value={(q.tdRatio * 100).toFixed(1) + '%'} />
        <StatBar label="INT Ratio" value={(q.intRatio * 100).toFixed(1) + '%'} />
        <StatBar label="QBR" value={q.qbr.toFixed(1)} />
      </>
    )
  }
  if ('recYPG' in s) {
    const w = s as WRStats
    return (
      <>
        <StatBar label="Rec YPG" value={w.recYPG.toFixed(1)} />
        <StatBar label="TDs/Game" value={w.tdPerGame.toFixed(2)} />
      </>
    )
  }
  if ('rushYPG' in s) {
    const r = s as RBStats
    return (
      <>
        <StatBar label="Rush YPG" value={r.rushYPG.toFixed(1)} />
        <StatBar label="TDs/Game" value={r.tdPerGame.toFixed(2)} />
      </>
    )
  }
  if ('fgAccuracy' in s) {
    const k = s as KStats
    return <StatBar label="FG Accuracy" value={(k.fgAccuracy * 100).toFixed(1) + '%'} />
  }
  if ('sacksAllowedPerGame' in s) {
    const o = s as OLineStats
    return (
      <>
        <StatBar label="Sacks Allowed/G" value={o.sacksAllowedPerGame.toFixed(1)} />
        <StatBar label="Rush YPC" value={o.rushYPC.toFixed(1)} />
        <StatBar label="Rush TD%" value={(o.rushTDPct * 100).toFixed(1) + '%'} />
        <StatBar label="Rank" value={`#${o.normalizedRank}`} />
      </>
    )
  }
  if ('sacksPerGame' in s) {
    const d = s as DLineStats
    return (
      <>
        <StatBar label="Sacks/G" value={d.sacksPerGame.toFixed(1)} />
        <StatBar label="Rush YPC Allowed" value={d.rushYPCAllowed.toFixed(1)} />
        <StatBar label="Rush TD% Allowed" value={(d.rushTDPctAllowed * 100).toFixed(1) + '%'} />
        <StatBar label="Rank" value={`#${d.normalizedRank}`} />
      </>
    )
  }
  const sec = s as SecondaryStats
  return (
    <>
      <StatBar label="Comp% Allowed" value={(sec.completionPctAllowed * 100).toFixed(1) + '%'} />
      <StatBar label="Yds/Att Allowed" value={sec.yardsPerAttemptAllowed.toFixed(1)} />
      <StatBar label="TD% Allowed" value={(sec.tdPctAllowed * 100).toFixed(1) + '%'} />
      <StatBar label="INT%" value={(sec.intPct * 100).toFixed(1) + '%'} />
      <StatBar label="Rank" value={`#${sec.normalizedRank}`} />
    </>
  )
}

export function PlayerCard({ slot, position, onReroll, rerollsRemaining = 0 }: PlayerCardProps) {
  const isUnit = 'position' in slot && !('name' in slot)
  const name = 'name' in slot ? slot.name : `${slot.team} ${POSITION_LABELS[position]}`

  return (
    <div
      className="bg-gray-900 border border-gray-800 border-l-4 rounded-xl p-4 flex flex-col gap-3"
      style={{ borderLeftColor: getTeamColor(slot.team) }}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            {POSITION_LABELS[position]}
          </span>
          <p className="text-white font-semibold mt-0.5">{name}</p>
          <div className="flex gap-1 mt-1">
            <Badge label={slot.team} />
            <Badge label={String(slot.year)} color="blue" />
            {isUnit && <Badge label="Unit" color="gray" />}
          </div>
        </div>
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
      </div>
      <div>{renderStats(slot)}</div>
    </div>
  )
}
