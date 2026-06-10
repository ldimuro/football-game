import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { PlayerCard } from '../roster/PlayerCard'
import { Button } from '../ui/Button'
import { playerCost } from '../../logic/playerValue'
import type { Player, TeamUnit, RosterPosition } from '../../types'

type ShopView = 'browse' | 'replace'

const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

function eligibleSlots(player: Player | TeamUnit): RosterPosition[] {
  if (player.position === 'WR') return ['WR1', 'WR2']
  const MAP: Partial<Record<string, RosterPosition>> = {
    QB: 'QB', RB: 'RB', K: 'K', OLine: 'OLine', DLine: 'DLine', Secondary: 'Secondary',
  }
  const slot = MAP[player.position]
  return slot ? [slot] : []
}

function displayPosition(player: Player | TeamUnit): RosterPosition {
  return eligibleSlots(player)[0] ?? 'QB'
}

function playerName(player: Player | TeamUnit): string {
  return 'name' in player
    ? player.name
    : `${player.team} ${POSITION_LABELS[displayPosition(player)]}`
}

interface Props {
  onClose: () => void
}

export function ShopModal({ onClose }: Props) {
  const { shopOffer, coins, shopComplete, roster, buyFromShop } = useGameStore()
  const [view, setView] = useState<ShopView>('browse')
  const [buyTarget, setBuyTarget] = useState<(Player | TeamUnit) | null>(null)
  const [sellPosition, setSellPosition] = useState<RosterPosition | null>(null)

  if (!shopOffer) return null

  const handleBuyClick = (player: Player | TeamUnit) => {
    const eligible = eligibleSlots(player)
    setBuyTarget(player)
    setSellPosition(eligible.length === 1 ? eligible[0] : null)
    setView('replace')
  }

  const handleConfirm = () => {
    if (!buyTarget || !sellPosition) return
    buyFromShop(buyTarget.id, sellPosition)
    onClose()
  }

  const handleBack = () => {
    setBuyTarget(null)
    setSellPosition(null)
    setView('browse')
  }

  if (view === 'replace' && buyTarget) {
    const cost = playerCost(buyTarget.rating)
    const slots = eligibleSlots(buyTarget)
    const refund = sellPosition && roster[sellPosition] ? playerCost(roster[sellPosition]!.rating) : 0
    const netCost = cost - refund

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
          <div className="p-5 border-b border-gray-800">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Buying</p>
            <p className="text-white font-bold">
              {playerName(buyTarget)}
              <span className="ml-2 text-yellow-400 font-bold">{cost} coins</span>
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Select slot to replace
            </p>
            {slots.map(pos => {
              const current = roster[pos]
              const isSelected = sellPosition === pos
              return (
                <button
                  key={pos}
                  onClick={() => setSellPosition(pos)}
                  className={`w-full text-left mb-3 rounded-xl ring-2 transition-colors ${
                    isSelected ? 'ring-indigo-500' : 'ring-transparent hover:ring-gray-600'
                  }`}
                >
                  {current ? (
                    <PlayerCard
                      slot={current}
                      position={pos}
                      coinValue={playerCost(current.rating)}
                    />
                  ) : (
                    <div className="p-4 bg-gray-900 rounded-xl text-gray-500 text-sm text-left">
                      {POSITION_LABELS[pos]} — Empty slot (no refund)
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="p-4 border-t border-gray-800">
            {sellPosition && (
              <p className="text-sm text-gray-400 mb-3">
                Net cost:{' '}
                <span className="text-yellow-400 font-bold">{netCost} coins</span>
                {' '}(buy {cost} – sell {refund})
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={handleBack}>Back</Button>
              <Button onClick={handleConfirm} disabled={!sellPosition}>
                Confirm Purchase
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Shop</p>
            <p className="text-sm text-gray-400">
              <span className="text-yellow-400 font-bold">{coins}</span> coins remaining
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>

        {shopComplete ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-gray-400 text-center">You've already made a purchase this round.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {shopOffer.map(player => {
                const cost = playerCost(player.rating)
                const canAfford = cost <= coins
                const pos = displayPosition(player)
                return (
                  <div key={player.id} className={!canAfford ? 'opacity-50' : ''}>
                    <PlayerCard slot={player} position={pos} coinValue={cost} />
                    <button
                      onClick={() => canAfford && handleBuyClick(player)}
                      disabled={!canAfford}
                      className={`mt-2 w-full px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        canAfford
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford ? `Buy — ${cost} coins` : `Can't afford (${cost} coins)`}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
