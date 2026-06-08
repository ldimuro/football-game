import { Button } from '../ui/Button'
import { PlayerCard } from '../roster/PlayerCard'
import type { Player, TeamUnit, RosterPosition } from '../../types'

interface ConfirmPickModalProps {
  newItem: Player | TeamUnit
  currentSlot: Player | TeamUnit | null
  targetPosition: RosterPosition
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmPickModal({ newItem, currentSlot, targetPosition, onConfirm, onCancel }: ConfirmPickModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl p-6 max-w-3xl w-full">
        <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-1">Confirm your pick</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">
          {currentSlot
            ? `Compare the new player with your current ${targetPosition} before locking it in.`
            : `This ${targetPosition} slot is currently empty.`}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Current</p>
            {currentSlot ? (
              <PlayerCard slot={currentSlot} position={targetPosition} />
            ) : (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 flex items-center justify-center min-h-[8rem]">
                <span className="text-gray-500 dark:text-gray-600 text-sm">Empty slot</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">New</p>
            <PlayerCard slot={newItem} position={targetPosition} />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            Cancel
          </button>
          <Button onClick={onConfirm}>Confirm Pick</Button>
        </div>
      </div>
    </div>
  )
}
