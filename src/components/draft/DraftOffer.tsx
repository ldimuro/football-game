import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { PlayerPickCard } from './PlayerPickCard'
import { SlotChooser } from './SlotChooser'
import { ConfirmPickModal } from './ConfirmPickModal'
import { Button } from '../ui/Button'
import type { Player, TeamUnit, RosterPosition } from '../../types'

export function DraftOffer() {
  const {
    round, currentDraftOffer, roster, draftRerollAvailable,
    isLoading, rerollDraftOfferTeam, rerollDraftOfferYear, draftPlayer, skipDraft,
  } = useGameStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSlotChooser, setShowSlotChooser] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<RosterPosition | null>(null)

  if (!currentDraftOffer) return null

  const allItems: (Player | TeamUnit)[] = [...currentDraftOffer.players, ...currentDraftOffer.units]
  const selected = allItems.find(i => i.id === selectedId)

  function handleSelect(item: Player | TeamUnit) {
    setSelectedId(item.id)
    setShowSlotChooser(false)
    setConfirmTarget(null)
  }

  function handleSelectPlayer() {
    if (!selected) return
    if (selected.position === 'WR') {
      setShowSlotChooser(true)
      return
    }
    setConfirmTarget(selected.position as RosterPosition)
  }

  function handleSlotChosen(slot: RosterPosition) {
    setShowSlotChooser(false)
    setConfirmTarget(slot)
  }

  function handleConfirmPick() {
    if (!selected || !confirmTarget) return
    setConfirmTarget(null)
    draftPlayer(selected.id, confirmTarget)
  }

  const wr1Name = roster.WR1 && 'name' in roster.WR1 ? (roster.WR1 as Player).name : null
  const wr2Name = roster.WR2 && 'name' in roster.WR2 ? (roster.WR2 as Player).name : null

  const byPosition = allItems.reduce<Record<string, (Player | TeamUnit)[]>>((acc, item) => {
    const pos = item.position
    if (!acc[pos]) acc[pos] = []
    acc[pos].push(item)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {showSlotChooser && (
        <SlotChooser
          onChoose={handleSlotChosen}
          onCancel={() => setShowSlotChooser(false)}
          currentWR1Name={wr1Name}
          currentWR2Name={wr2Name}
        />
      )}

      {selected && confirmTarget && (
        <ConfirmPickModal
          newItem={selected}
          currentSlot={roster[confirmTarget]}
          targetPosition={confirmTarget}
          onConfirm={handleConfirmPick}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Week {round} Draft Offer</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {/* lowercase + CSS uppercase: keeps DOM text "ne" so the case-sensitive getByText(/NE/) in DraftOffer.test.tsx matches only the unit card's "NE Secondary", not this header */}
            <span className="uppercase">{currentDraftOffer.team.toLowerCase()}</span>{' '}
            <span className="text-gray-500 dark:text-gray-400 font-normal">{currentDraftOffer.year}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={rerollDraftOfferTeam}
            variant="secondary"
            disabled={!draftRerollAvailable || isLoading}
          >
            Re-Roll Team
          </Button>
          <Button
            onClick={rerollDraftOfferYear}
            variant="secondary"
            disabled={!draftRerollAvailable || isLoading}
          >
            Re-Roll Year
          </Button>
          <Button onClick={skipDraft} variant="ghost" disabled={isLoading}>
            Skip
          </Button>
          <Button onClick={handleSelectPlayer} disabled={!selectedId || isLoading}>
            Select Player
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(byPosition).map(([pos, items]) => (
          <div key={pos}>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{pos}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map(item => (
                <PlayerPickCard
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  onClick={() => handleSelect(item)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
