import { Button } from '../ui/Button'

interface Props {
  playerName: string
  refundValue: number
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSellModal({ playerName, refundValue, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Sell Player?</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Sell{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{playerName}</span>?
          You'll receive{' '}
          <span className="font-bold text-yellow-500 dark:text-yellow-400">{refundValue} coins</span>{' '}
          and the slot will be left empty.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg font-semibold text-sm bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            Confirm Sale
          </button>
        </div>
      </div>
    </div>
  )
}
