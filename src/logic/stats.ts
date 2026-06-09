import type { Roster, AggregateStats, RosterSummary, Player, QBStats, WRStats, RBStats, OLineStats, DLineStats, SecondaryStats } from '../types'

export function computeAggregateStats(roster: Roster): AggregateStats {
  const qbStats = roster.QB?.stats as QBStats | undefined
  const rbStats = roster.RB?.stats as RBStats | undefined
  const oLineStats = roster.OLine?.stats as OLineStats | undefined
  const dLineStats = roster.DLine?.stats as DLineStats | undefined
  const secStats = roster.Secondary?.stats as SecondaryStats | undefined

  return {
    passYPG: qbStats?.passYPG ?? 0,
    rushYPG: rbStats?.rushYPG ?? 0,
    oLineRank: oLineStats?.normalizedRank ?? 16,
    dLineRank: dLineStats?.normalizedRank ?? 16,
    secondaryRank: secStats?.normalizedRank ?? 16,
  }
}

export function computeRosterSummary(roster: Roster): RosterSummary {
  const qb = roster.QB?.stats as QBStats | undefined
  const wr1 = roster.WR1?.stats as WRStats | undefined
  const wr2 = roster.WR2?.stats as WRStats | undefined
  const rb = roster.RB?.stats as RBStats | undefined
  const oLineStats = roster.OLine?.stats as OLineStats | undefined
  const dLineStats = roster.DLine?.stats as DLineStats | undefined
  const secStats = roster.Secondary?.stats as SecondaryStats | undefined

  const passYPG = qb?.passYPG ?? 0
  const recYPG = (wr1?.recYPG ?? 0) + (wr2?.recYPG ?? 0) + (rb?.recYPG ?? 0)
  const rushYPG = rb?.rushYPG ?? 0

  const tdPerGame = (qb?.avgTDPerGame ?? 0) + (wr1?.tdPerGame ?? 0) + (wr2?.tdPerGame ?? 0) + (rb?.tdPerGame ?? 0)

  const slots = [roster.QB, roster.WR1, roster.WR2, roster.RB, roster.K, roster.OLine, roster.DLine, roster.Secondary]
  const players = slots.filter((s): s is Player => !!s && 'name' in s)

  const allRatings = slots.map(s => s?.rating ?? null).filter((r): r is number => r !== null)
  const avgRating = allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : null

  const offRatings = [roster.QB?.rating, roster.WR1?.rating, roster.WR2?.rating, roster.RB?.rating]
    .filter((r): r is number => r !== undefined)
  const avgOffRating = offRatings.length ? offRatings.reduce((a, b) => a + b, 0) / offRatings.length : null

  const defRatings = [roster.DLine?.rating, roster.Secondary?.rating]
    .filter((r): r is number => r !== undefined)
  const avgDefRating = defRatings.length ? defRatings.reduce((a, b) => a + b, 0) / defRatings.length : null

  return {
    totalOffensiveYPG: Math.round((passYPG + recYPG + rushYPG) * 10) / 10,
    totalTDsPerGame: Math.round(tdPerGame * 100) / 100,
    avgOffRating,
    avgDefRating,
    oLineRating: roster.OLine?.rating ?? null,
    dLineRating: roster.DLine?.rating ?? null,
    secondaryRating: roster.Secondary?.rating ?? null,
    avgRating,
    allProCount: players.filter(p => p.is_all_pro).length,
    awardWinnerCount: players.filter(p => p.is_mvp || p.is_opy || p.is_dpy).length,
    rosterFilled: slots.filter(Boolean).length,
    rosterSize: slots.length,
  }
}
