import type { Roster, TeamRatings, DriveResult, DriveOutcome, SimulationResult, QBStats } from '../types'

export function computeTeamRatings(roster: Roster): TeamRatings {
  const qbStats = roster.QB?.stats as QBStats | undefined
  return {
    passRating: roster.QB?.rating ?? 50,
    rushRating: roster.RB?.rating ?? 50,
    oLineRating: roster.OLine?.rating ?? 50,
    dLineRating: roster.DLine?.rating ?? 50,
    secondaryRating: roster.Secondary?.rating ?? 50,
    kickerRating: roster.K?.rating ?? 50,
    qbIntRisk: (qbStats?.avgINTPerGame ?? 1.0) * 10,
  }
}

const TEMPERATURE = 20

function noise(range: number): number {
  return Math.random() * range * 2 - range
}

function softmax(scores: number[]): number[] {
  const exps = scores.map(s => Math.exp(s / TEMPERATURE))
  const total = exps.reduce((a, b) => a + b, 0)
  return exps.map(e => e / total)
}

function sampleOutcome(probs: number[]): number {
  const r = Math.random()
  let cumulative = 0
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i]
    if (r < cumulative) return i
  }
  return probs.length - 1
}

const OUTCOMES: DriveOutcome[] = ['TD', 'FG', 'Punt', 'Turnover', 'DefTD', 'Safety']

const POINTS: Record<DriveOutcome, number> = {
  TD: 7, FG: 3, Punt: 0, Turnover: 0, DefTD: 7, Safety: 2,
}

function resolveScoringTeam(
  outcome: DriveOutcome,
  possession: 'user' | 'opponent',
): 'user' | 'opponent' | null {
  const defender: 'user' | 'opponent' = possession === 'user' ? 'opponent' : 'user'
  if (outcome === 'TD' || outcome === 'FG') return possession
  if (outcome === 'DefTD' || outcome === 'Safety') return defender
  return null
}

export function simulateDrive(
  offense: TeamRatings,
  defense: TeamRatings,
  possession: 'user' | 'opponent',
  quarter: number,
): DriveResult {
  const passAdv = offense.passRating - defense.secondaryRating
  const rushAdv = offense.rushRating - defense.dLineRating
  const protectionAdv = offense.oLineRating - defense.dLineRating

  const turnoverScore =
    0.30 * defense.secondaryRating +
    0.25 * defense.dLineRating +
    offense.qbIntRisk -
    0.25 * protectionAdv +
    noise(3)

  const scores = [
    0.45 * passAdv + 0.30 * rushAdv + 0.15 * protectionAdv + noise(3),        // TD
    0.20 * passAdv + 0.20 * rushAdv + 0.10 * protectionAdv + 0.25 * offense.kickerRating + noise(3), // FG
    -0.35 * passAdv - 0.35 * rushAdv - 0.10 * protectionAdv + noise(3),        // Punt
    turnoverScore,                                                               // Turnover
    turnoverScore * 0.25 + noise(3),                                            // DefTD
    0.10 * defense.dLineRating - 0.10 * protectionAdv + noise(1),              // Safety
  ]

  const outcome = OUTCOMES[sampleOutcome(softmax(scores))]
  return {
    possession,
    quarter,
    outcome,
    scoringTeam: resolveScoringTeam(outcome, possession),
    points: POINTS[outcome],
  }
}

export function simulateGame(
  userRoster: Roster,
  opponentRoster: Roster,
  opponentLabel: string,
): SimulationResult {
  const userRatings = computeTeamRatings(userRoster)
  const oppRatings = computeTeamRatings(opponentRoster)
  const drives: DriveResult[] = []

  for (let q = 1; q <= 4; q++) {
    for (let d = 0; d < 3; d++) {
      drives.push(simulateDrive(userRatings, oppRatings, 'user', q))
      drives.push(simulateDrive(oppRatings, userRatings, 'opponent', q))
    }
  }

  let userScore = 0
  let opponentScore = 0
  for (const drive of drives) {
    if (drive.scoringTeam === 'user') userScore += drive.points
    else if (drive.scoringTeam === 'opponent') opponentScore += drive.points
  }

  return {
    userTeamLabel: 'Your Team',
    opponentTeamLabel: opponentLabel,
    drives,
    userScore,
    opponentScore,
    winner: userScore > opponentScore ? 'user' : opponentScore > userScore ? 'opponent' : 'tie',
  }
}
