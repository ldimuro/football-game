import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { RosterGrid } from '../roster/RosterGrid'
import { RosterSummary } from '../roster/RosterSummary'
import { ConfirmSellModal } from '../roster/ConfirmSellModal'
import { playerCost } from '../../logic/playerValue'
import type { RosterPosition } from '../../types'

const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

export function RosterView() {
  const { roster, sellPlayer } = useGameStore()
  const [sellPos, setSellPos] = useState<RosterPosition | null>(null)

  const sellSlot = sellPos ? roster[sellPos] : null
  const playerName = sellSlot
    ? ('name' in sellSlot ? sellSlot.name : `${sellSlot.team} ${POSITION_LABELS[sellPos!]}`)
    : ''

  const confirmSell = () => {
    if (sellPos) sellPlayer(sellPos)
    setSellPos(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Roster</h2>
      <RosterSummary roster={roster} />
      <RosterGrid roster={roster} onSell={setSellPos} />
      {sellPos && sellSlot && (
        <ConfirmSellModal
          playerName={playerName}
          refundValue={playerCost(sellSlot.rating)}
          onConfirm={confirmSell}
          onCancel={() => setSellPos(null)}
        />
      )}
    </div>
  )
}
