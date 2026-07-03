import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { PlayerCard } from '../roster/PlayerCard'
import { Button } from '../ui/Button'
import { playerCost, slotCost, abilityCost } from '../../logic/playerValue'
import { compatibleRosterPositions, abilityPositionLabel } from '../../logic/abilityGen'
import { ABILITY_DISPLAY, ABILITY_DESCRIPTIONS, ABILITY_RARITY } from '../../logic/abilityEngine'
import type { Player, TeamUnit, RosterPosition } from '../../types'

type PlayerShopView = 'browse' | 'replace'
type AbilityShopView = 'browse' | 'player-select' | 'confirm-replace'

const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

const ALL_POSITIONS: RosterPosition[] = ['QB', 'WR1', 'WR2', 'RB', 'K', 'OLine', 'DLine', 'Secondary']

const RARITY_COLORS: Record<string, string> = {
  Common: 'text-gray-400',
  Uncommon: 'text-blue-400',
  Rare: 'text-purple-400',
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
  const {
    shopOffer, coins, shopComplete, roster, buyFromShop,
    abilityShopOffer, abilityShopComplete, buyAbility,
  } = useGameStore()

  // All hooks before any conditional returns
  const [activeTab, setActiveTab] = useState<'player' | 'ability'>('player')
  const [playerView, setPlayerView] = useState<PlayerShopView>('browse')
  const [buyTarget, setBuyTarget] = useState<(Player | TeamUnit) | null>(null)
  const [sellPosition, setSellPosition] = useState<RosterPosition | null>(null)
  const [abilityView, setAbilityView] = useState<AbilityShopView>('browse')
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null)
  const [confirmPosition, setConfirmPosition] = useState<RosterPosition | null>(null)

  if (!shopOffer) return null

  const switchTab = (tab: 'player' | 'ability') => {
    setActiveTab(tab)
    setPlayerView('browse')
    setBuyTarget(null)
    setSellPosition(null)
    setAbilityView('browse')
    setSelectedAbilityId(null)
    setConfirmPosition(null)
  }

  // ─── Player Shop handlers ────────────────────────────────────────────────────

  const handlePlayerBuyClick = (player: Player | TeamUnit) => {
    const eligible = eligibleSlots(player)
    setBuyTarget(player)
    setSellPosition(eligible.length === 1 ? eligible[0] : null)
    setPlayerView('replace')
  }

  const handlePlayerConfirm = () => {
    if (!buyTarget || !sellPosition) return
    buyFromShop(buyTarget.id, sellPosition)
    onClose()
  }

  const handlePlayerBack = () => {
    setBuyTarget(null)
    setSellPosition(null)
    setPlayerView('browse')
  }

  // ─── Ability Shop handlers ───────────────────────────────────────────────────

  const handleAbilityBuyClick = (abilityId: string) => {
    setSelectedAbilityId(abilityId)
    setAbilityView('player-select')
  }

  const handlePositionClick = (pos: RosterPosition) => {
    if (!selectedAbilityId) return
    const currentSlot = roster[pos]
    if (!currentSlot) return
    if (currentSlot.ability) {
      setConfirmPosition(pos)
      setAbilityView('confirm-replace')
    } else {
      buyAbility(selectedAbilityId, pos)
      onClose()
    }
  }

  const handleAbilityConfirm = () => {
    if (!selectedAbilityId || !confirmPosition) return
    buyAbility(selectedAbilityId, confirmPosition)
    onClose()
  }

  const handleAbilityBack = () => {
    if (abilityView === 'confirm-replace') {
      setConfirmPosition(null)
      setAbilityView('player-select')
    } else {
      setSelectedAbilityId(null)
      setAbilityView('browse')
    }
  }

  // ─── Shared tab bar ──────────────────────────────────────────────────────────

  const tabBar = (
    <div className="flex border-b border-gray-800">
      {(['player', 'ability'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => switchTab(tab)}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === tab
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          {tab === 'player' ? 'Player Shop' : 'Ability Shop'}
        </button>
      ))}
    </div>
  )

  // ─── Player Shop — replace sub-view ─────────────────────────────────────────

  if (activeTab === 'player' && playerView === 'replace' && buyTarget) {
    const cost = playerCost(buyTarget.rating)
    const slots = eligibleSlots(buyTarget)
    const refund = sellPosition ? slotCost(roster[sellPosition]) : 0
    const netCost = cost - refund

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="text-yellow-400 font-bold">{coins}</span> coins remaining
            </p>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
          {tabBar}
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
                    <PlayerCard slot={current} position={pos} coinValue={slotCost(current)} />
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
              <Button variant="secondary" onClick={handlePlayerBack}>Back</Button>
              <Button onClick={handlePlayerConfirm} disabled={!sellPosition}>Confirm Purchase</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Ability Shop — confirm-replace sub-view ─────────────────────────────────

  if (activeTab === 'ability' && abilityView === 'confirm-replace' && selectedAbilityId && confirmPosition) {
    const slot = roster[confirmPosition]
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="text-yellow-400 font-bold">{coins}</span> coins remaining
            </p>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
          {tabBar}
          <div className="p-6">
            <p className="text-white font-semibold mb-2">Replace ability?</p>
            <p className="text-sm text-gray-400">
              Replace{' '}
              <span className="text-white font-semibold">
                {ABILITY_DISPLAY[slot?.ability ?? ''] ?? slot?.ability}
              </span>
              {' '}with{' '}
              <span className="text-white font-semibold">
                {ABILITY_DISPLAY[selectedAbilityId]}
              </span>
              {' '}on{' '}
              <span className="text-white font-semibold">{POSITION_LABELS[confirmPosition]}</span>?
            </p>
          </div>
          <div className="p-4 border-t border-gray-800 flex gap-2 justify-end">
            <Button variant="secondary" onClick={handleAbilityBack}>Cancel</Button>
            <Button onClick={handleAbilityConfirm}>Confirm</Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Ability Shop — player-select sub-view ───────────────────────────────────

  if (activeTab === 'ability' && abilityView === 'player-select' && selectedAbilityId) {
    const compatible = compatibleRosterPositions(selectedAbilityId)
    const cost = abilityCost(selectedAbilityId)

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
          <div className="p-5 border-b border-gray-800 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="text-yellow-400 font-bold">{coins}</span> coins remaining
            </p>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
          {tabBar}
          <div className="p-5 border-b border-gray-800">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Buying ability</p>
            <p className="text-white font-bold">
              {ABILITY_DISPLAY[selectedAbilityId]}
              <span className="ml-2 text-yellow-400 font-bold">{cost} coins</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">{ABILITY_DESCRIPTIONS[selectedAbilityId]}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Select a player to receive this ability
            </p>
            {ALL_POSITIONS.map(pos => {
              const slot = roster[pos]
              const isCompatible = compatible.includes(pos)
              const isDisabled = !isCompatible || !slot
              return (
                <button
                  key={pos}
                  onClick={() => !isDisabled && handlePositionClick(pos)}
                  disabled={isDisabled}
                  className={`w-full text-left mb-3 rounded-xl ring-2 transition-colors ${
                    isDisabled
                      ? 'opacity-40 ring-transparent cursor-not-allowed'
                      : 'ring-transparent hover:ring-indigo-500 cursor-pointer'
                  }`}
                >
                  {slot ? (
                    <PlayerCard slot={slot} position={pos} />
                  ) : (
                    <div className="p-4 bg-gray-900 rounded-xl text-gray-500 text-sm">
                      {POSITION_LABELS[pos]} — Empty
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          <div className="p-4 border-t border-gray-800 flex justify-end">
            <Button variant="secondary" onClick={handleAbilityBack}>Back</Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Browse views (Player Shop + Ability Shop) ───────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            <span className="text-yellow-400 font-bold">{coins}</span> coins remaining
          </p>
          <Button variant="ghost" onClick={onClose}>✕</Button>
        </div>
        {tabBar}

        {/* Player Shop browse */}
        {activeTab === 'player' && (
          shopComplete ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-gray-400 text-center">You've already bought a player this round.</p>
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
                        onClick={() => canAfford && handlePlayerBuyClick(player)}
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
          )
        )}

        {/* Ability Shop browse */}
        {activeTab === 'ability' && (
          !abilityShopOffer || abilityShopComplete ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-gray-400 text-center">
                {abilityShopComplete
                  ? "You've already bought an ability this round."
                  : 'No abilities available.'}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {abilityShopOffer.map(abilityId => {
                  const cost = abilityCost(abilityId)
                  const canAfford = cost <= coins
                  const rarity = ABILITY_RARITY[abilityId] ?? 'Common'
                  const posLabel = abilityPositionLabel(abilityId)
                  return (
                    <div
                      key={abilityId}
                      className={`bg-gray-900 rounded-xl p-4 ${!canAfford ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-white font-bold text-sm">{ABILITY_DISPLAY[abilityId]}</p>
                        <span className={`text-xs font-semibold ml-2 shrink-0 ${RARITY_COLORS[rarity] ?? 'text-gray-400'}`}>
                          {rarity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">{ABILITY_DESCRIPTIONS[abilityId]}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{posLabel}</span>
                        <button
                          onClick={() => canAfford && handleAbilityBuyClick(abilityId)}
                          disabled={!canAfford}
                          className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                            canAfford
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? `Buy — ${cost} coins` : `${cost} coins`}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
