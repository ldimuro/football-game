import { Button } from '../ui/Button'
import type { RosterPosition } from '../../types'

interface SlotChooserProps {
  onChoose: (slot: RosterPosition) => void
  onCancel: () => void
  currentWR1Name: string | null
  currentWR2Name: string | null
}

export function SlotChooser({ onChoose, onCancel, currentWR1Name, currentWR2Name }: SlotChooserProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl p-6 w-80">
        <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-1">Choose a slot</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">Which receiver slot should this player fill?</p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => onChoose('WR1')} variant="secondary">
            WR1 {currentWR1Name ? `(replace ${currentWR1Name})` : '(empty)'}
          </Button>
          <Button onClick={() => onChoose('WR2')} variant="secondary">
            WR2 {currentWR2Name ? `(replace ${currentWR2Name})` : '(empty)'}
          </Button>
        </div>
        <button onClick={onCancel} className="mt-4 w-full text-center text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
          Cancel
        </button>
      </div>
    </div>
  )
}
