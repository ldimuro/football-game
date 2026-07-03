import type { DriveResult, SimulationResult } from '../../types'

function buildScorerMap(tds: DriveResult[]): Record<string, number> {
  const map: Record<string, number> = {}
  tds.forEach(d => {
    if (d.scoringPlayerName && d.scoringPlayerPos) {
      const key = `${d.scoringPlayerName} (${d.scoringPlayerPos})`
      map[key] = (map[key] ?? 0) + 1
    }
  })
  return map
}

function computeBoxScore(result: SimulationResult) {
  const { drives } = result

  const userDrives = drives.filter(d => d.possession === 'user')
  const oppDrives = drives.filter(d => d.possession === 'opponent')

  const userOffYards = userDrives.reduce((s, d) => s + (d.yards ?? 0), 0)
  const oppOffYards = oppDrives.reduce((s, d) => s + (d.yards ?? 0), 0)

  const userRunPlays = userDrives.reduce((s, d) => s + (d.runPlays ?? 0), 0)
  const oppRunPlays = oppDrives.reduce((s, d) => s + (d.runPlays ?? 0), 0)
  const userPassPlays = userDrives.reduce((s, d) => s + (d.passPlays ?? 0), 0)
  const oppPassPlays = oppDrives.reduce((s, d) => s + (d.passPlays ?? 0), 0)
  const userNegPlays = userDrives.reduce((s, d) => s + (d.negativePlays ?? 0), 0)
  const oppNegPlays = oppDrives.reduce((s, d) => s + (d.negativePlays ?? 0), 0)

  const userTDs = drives.filter(d => d.scoringTeam === 'user' && d.outcome === 'TD')
  const oppTDs = drives.filter(d => d.scoringTeam === 'opponent' && d.outcome === 'TD')

  const userFGMade = userDrives.filter(d => d.outcome === 'FG').length
  const userFGAtt = userDrives.filter(d => d.outcome === 'FG' || d.outcome === 'FG-missed').length
  const oppFGMade = oppDrives.filter(d => d.outcome === 'FG').length
  const oppFGAtt = oppDrives.filter(d => d.outcome === 'FG' || d.outcome === 'FG-missed').length

  const userPunts = userDrives.filter(d => d.outcome === 'Punt').length
  const oppPunts = oppDrives.filter(d => d.outcome === 'Punt').length
  const userTurnovers = userDrives.filter(d => d.outcome === 'Turnover').length
  const oppTurnovers = oppDrives.filter(d => d.outcome === 'Turnover').length

  return {
    userOffYards, oppOffYards,
    userRunPlays, oppRunPlays,
    userPassPlays, oppPassPlays,
    userNegPlays, oppNegPlays,
    userTDs: userTDs.length, oppTDs: oppTDs.length,
    userFGMade, userFGAtt, oppFGMade, oppFGAtt,
    userPunts, oppPunts,
    userTurnovers, oppTurnovers,
    userTDScorers: buildScorerMap(userTDs),
    oppTDScorers: buildScorerMap(oppTDs),
  }
}

function StatRow({ label, user, opp }: { label: string; user: string; opp: string }) {
  return (
    <div className="grid grid-cols-[1fr_5rem_5rem] gap-x-2 items-center py-1.5 border-b border-gray-800 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-right text-indigo-300 font-mono tabular-nums">{user}</span>
      <span className="text-right text-gray-300 font-mono tabular-nums">{opp}</span>
    </div>
  )
}

export function BoxScore({ result }: { result: SimulationResult }) {
  const s = computeBoxScore(result)
  const { userTeamLabel, opponentTeamLabel } = result

  const userScorerEntries = Object.entries(s.userTDScorers)
  const oppScorerEntries = Object.entries(s.oppTDScorers)

  return (
    <div className="space-y-5">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_5rem_5rem] gap-x-2 pb-1 border-b border-gray-700">
        <span />
        <span className="text-right text-xs font-bold text-indigo-400 uppercase tracking-wider truncate">{userTeamLabel}</span>
        <span className="text-right text-xs font-bold text-gray-400 uppercase tracking-wider truncate">{opponentTeamLabel}</span>
      </div>

      {/* Yards */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Yards</p>
        <StatRow label="OFF Yards" user={String(s.userOffYards)} opp={String(s.oppOffYards)} />
        <StatRow label="DEF Yards Allowed" user={String(s.oppOffYards)} opp={String(s.userOffYards)} />
      </div>

      {/* Play counts */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Plays</p>
        <StatRow label="Pass Plays" user={String(s.userPassPlays)} opp={String(s.oppPassPlays)} />
        <StatRow label="Run Plays" user={String(s.userRunPlays)} opp={String(s.oppRunPlays)} />
        <StatRow label="Negative Plays" user={String(s.userNegPlays)} opp={String(s.oppNegPlays)} />
      </div>

      {/* Scoring */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Scoring</p>
        <StatRow label="Touchdowns" user={String(s.userTDs)} opp={String(s.oppTDs)} />
        <StatRow label="Field Goals (M/A)" user={`${s.userFGMade}/${s.userFGAtt}`} opp={`${s.oppFGMade}/${s.oppFGAtt}`} />
        <StatRow label="Punts" user={String(s.userPunts)} opp={String(s.oppPunts)} />
        <StatRow label="Turnovers" user={String(s.userTurnovers)} opp={String(s.oppTurnovers)} />
      </div>

      {/* Drive ratio */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Drive Outcomes</p>
        <div className="grid grid-cols-[1fr_5rem_5rem] gap-x-2 items-start py-1.5 text-sm">
          <span className="text-gray-400">TD / FG / Punt / TO</span>
          <span className="text-right text-indigo-300 font-mono">{s.userTDs} / {s.userFGMade} / {s.userPunts} / {s.userTurnovers}</span>
          <span className="text-right text-gray-300 font-mono">{s.oppTDs} / {s.oppFGMade} / {s.oppPunts} / {s.oppTurnovers}</span>
        </div>
      </div>

      {/* TD scorers */}
      {(userScorerEntries.length > 0 || oppScorerEntries.length > 0) && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">TD Scorers</p>
          {userScorerEntries.length > 0 && (
            <div className="mb-1.5">
              <span className="text-xs text-indigo-400 font-semibold">{userTeamLabel}: </span>
              <span className="text-xs text-gray-300">
                {userScorerEntries.map(([name, count]) => count > 1 ? `${name} ×${count}` : name).join(', ')}
              </span>
            </div>
          )}
          {oppScorerEntries.length > 0 && (
            <div>
              <span className="text-xs text-gray-400 font-semibold">{opponentTeamLabel}: </span>
              <span className="text-xs text-gray-300">
                {oppScorerEntries.map(([name, count]) => count > 1 ? `${name} ×${count}` : name).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
