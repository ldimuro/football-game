import { ABILITY_DISPLAY } from '../../logic/abilityEngine'
import { useGameStore } from '../../store/gameStore'
import type { Roster, SimulationResult, Player, TeamUnit } from '../../types'

function dieAvgColor(val: number | null): string {
  if (val === null) return 'text-gray-400 dark:text-gray-500'
  if (val >= 14) return 'text-green-500 dark:text-green-400'
  if (val >= 9) return 'text-yellow-500 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

function avgDieFace(players: (Player | TeamUnit | null | undefined)[]): number | null {
  const means = players
    .filter((p): p is Player | TeamUnit => p != null)
    .map(p => p.die && p.die.length > 0 ? p.die.reduce((a, b) => a + b, 0) / p.die.length : null)
    .filter((v): v is number => v !== null)
  if (means.length === 0) return null
  return means.reduce((a, b) => a + b, 0) / means.length
}

function fmtStat(val: number | null, dec: 0 | 1 = 0): string {
  if (val === null) return '—'
  if (dec === 1) return val.toFixed(1)
  return val % 1 === 0 ? String(val) : val.toFixed(1)
}

function abilityEmoji(abilityId: string): string {
  return (ABILITY_DISPLAY[abilityId] ?? abilityId).split(' ')[0]
}

function computeSeasonStats(history: SimulationResult[]) {
  const g = history.length
  if (g === 0) return null

  const userDrives = history.flatMap(r => r.drives.filter(d => d.possession === 'user'))
  const oppDrives  = history.flatMap(r => r.drives.filter(d => d.possession === 'opponent'))
  const userTDs    = history.flatMap(r => r.drives.filter(d => d.scoringTeam === 'user' && d.outcome === 'TD'))
  const userTOs    = userDrives.filter(d => d.outcome === 'Turnover' || d.outcome === 'TurnoverOnDowns').length
  const toForced   = oppDrives.filter(d => d.outcome === 'Turnover' || d.outcome === 'TurnoverOnDowns').length

  const totalYards     = userDrives.reduce((s, d) => s + (d.yards ?? 0), 0)
  const totalPassYards = userDrives.reduce((s, d) => s + (d.passYards ?? 0), 0)
  const totalRushYards = userDrives.reduce((s, d) => s + (d.rushYards ?? 0), 0)
  const defNegPlays    = oppDrives.reduce((s, d) => s + (d.negativePlays ?? 0), 0)
  const fgMade         = userDrives.filter(d => d.outcome === 'FG').length
  const fgAtt          = userDrives.filter(d => d.outcome === 'FG' || d.outcome === 'FG-missed').length
  const passTDs        = userTDs.filter(d => d.scoringPlayerPos === 'WR').length
  const rushTDs        = userTDs.filter(d => d.scoringPlayerPos === 'RB').length
  const avgScore       = history.reduce((s, r) => s + r.userScore, 0) / g

  const fgMisses = userDrives.filter(d => d.outcome === 'FG-missed' && d.fgDifficulty != null && d.fgRoll != null)
  const avgMissDistance = fgMisses.length > 0
    ? fgMisses.reduce((s, d) => s + (d.fgDifficulty! - d.fgRoll!), 0) / fgMisses.length
    : null

  return {
    g,
    avgScore,
    avgYards:     totalYards / g,
    avgPassYards: totalPassYards / g,
    avgRushYards: totalRushYards / g,
    avgTDs:       userTDs.length / g,
    avgTOs:       userTOs / g,
    passTDs,
    rushTDs,
    toForced,
    defNegPlays,
    defAvgNegPlays: defNegPlays / g,
    fgMade,
    fgAtt,
    avgMissDistance,
  }
}

export function RosterSummary({ roster }: { roster: Roster }) {
  const { coins, simulationHistory } = useGameStore()

  const slots = [roster.QB, roster.WR1, roster.WR2, roster.RB, roster.K, roster.OLine, roster.DLine, roster.Secondary]

  const offAvg = avgDieFace([roster.QB, roster.WR1, roster.WR2, roster.RB])
  const defAvg = avgDieFace([roster.DLine, roster.Secondary])
  const allAvg = avgDieFace(slots)

  const abilities = slots
    .filter(s => s?.ability)
    .map(s => ({ emoji: abilityEmoji(s!.ability!), label: ABILITY_DISPLAY[s!.ability!] ?? s!.ability! }))

  const capColor = coins < 20
    ? 'text-red-500 dark:text-red-400'
    : coins < 50
    ? 'text-yellow-500 dark:text-yellow-400'
    : 'text-green-500 dark:text-green-400'

  const rows = [
    { label: 'OFF', avg: offAvg },
    { label: 'DEF', avg: defAvg },
    { label: 'All', avg: allAvg },
  ]

  const season = computeSeasonStats(simulationHistory)

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-6">
      <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Roster Summary</h3>

      {/* Avg die face per group */}
      <div className="flex gap-4 mb-5">
        {rows.map(({ label, avg }) => (
          <div key={label} className="flex-1 text-center">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${dieAvgColor(avg)}`}>
              {fmtStat(avg, 1)}
            </p>
          </div>
        ))}
      </div>

      {/* Cap Space */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mb-4 flex items-baseline gap-2">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cap Space</span>
        <span className={`text-xl font-bold tabular-nums ${capColor}`}>{coins}</span>
        <span className="text-sm text-gray-400 dark:text-gray-500">/ 200</span>
      </div>

      {/* Abilities */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex items-center gap-3 mb-4">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">Abilities</span>
        {abilities.length === 0 ? (
          <span className="text-gray-400 dark:text-gray-500 text-sm">—</span>
        ) : (
          <span className="flex gap-2 flex-wrap">
            {abilities.map((a, i) => (
              <span key={i} title={a.label} className="text-xl cursor-default select-none">{a.emoji}</span>
            ))}
          </span>
        )}
      </div>

      {/* Season Stats */}
      {season && (
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 flex flex-col gap-4">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Season Stats <span className="font-normal normal-case text-gray-400">({season.g} {season.g === 1 ? 'game' : 'games'})</span>
          </p>

          <StatGroup label="Team">
            <StatLine label="Avg Score/G"   value={season.avgScore.toFixed(1)} />
            <StatLine label="Avg Yards/G"   value={season.avgYards.toFixed(1)} />
            <StatLine label="Avg TDs/G"     value={season.avgTDs.toFixed(2)} />
            <StatLine label="Avg TOs/G"     value={season.avgTOs.toFixed(2)} />
          </StatGroup>

          <StatGroup label="OFF">
            <StatLine label="Avg Rush Yds/G" value={season.avgRushYards.toFixed(1)} />
            <StatLine label="Avg Pass Yds/G" value={season.avgPassYards.toFixed(1)} />
            <StatLine label="Pass TDs"       value={String(season.passTDs)} />
            <StatLine label="Rush TDs"       value={String(season.rushTDs)} />
          </StatGroup>

          <StatGroup label="DEF">
            <StatLine label="Avg TOs/G"          value={(season.toForced / season.g).toFixed(2)} />
            <StatLine label="Avg Neg Plays/G"     value={season.defAvgNegPlays.toFixed(1)} />
            <StatLine label="TOs Forced"          value={String(season.toForced)} />
            <StatLine label="Neg Plays"           value={String(season.defNegPlays)} />
          </StatGroup>

          <StatGroup label="Kicker">
            <StatLine
              label="Made/Att"
              value={`${season.fgMade}/${season.fgAtt} (${season.fgAtt > 0 ? ((season.fgMade / season.fgAtt) * 100).toFixed(0) : '—'}%)`}
            />
            <StatLine
              label="Avg Miss Dist"
              value={season.avgMissDistance !== null ? season.avgMissDistance.toFixed(1) : '—'}
            />
          </StatGroup>
        </div>
      )}
    </div>
  )
}

function StatGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-1.5">{label}</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {children}
      </div>
    </div>
  )
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-gray-500 dark:text-gray-400 text-xs">{label}</span>
      <span className="text-gray-900 dark:text-white font-semibold tabular-nums">{value}</span>
    </div>
  )
}
