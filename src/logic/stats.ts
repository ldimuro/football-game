import type { Roster, AggregateStats, QBStats, RBStats, OLineStats, DLineStats, SecondaryStats } from '../types'

export function eraNormalize(rawStat: number, normFactor: number): number {
  return rawStat * normFactor
}

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
