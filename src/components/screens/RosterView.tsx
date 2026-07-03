import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { RosterGrid } from '../roster/RosterGrid'
import { RosterSummary } from '../roster/RosterSummary'
import { ConfirmSellModal } from '../roster/ConfirmSellModal'
import { slotCost } from '../../logic/playerValue'
import type { RosterPosition } from '../../types'

const POSITION_LABELS: Record<RosterPosition, string> = {
  QB: 'QB', WR1: 'WR1', WR2: 'WR2', RB: 'RB', K: 'K',
  OLine: 'O-Line', DLine: 'D-Line', Secondary: 'Secondary',
}

function buildSaveJson(store: ReturnType<typeof useGameStore.getState>): string {
  const { roster, coins, round, activeRule, seasonLog, simulationHistory } = store
  return JSON.stringify(
    {
      savedAt: new Date().toISOString(),
      round,
      coins,
      activeRule,
      roster,
      seasonLog,
      simulationHistory,
    },
    null,
    2,
  )
}

export function RosterView() {
  const store = useGameStore()
  const { roster, sellPlayer } = store
  const [sellPos, setSellPos] = useState<RosterPosition | null>(null)
  const [showSave, setShowSave] = useState(false)
  const [copied, setCopied] = useState(false)

  const sellSlot = sellPos ? roster[sellPos] : null
  const playerName = sellSlot
    ? ('name' in sellSlot ? sellSlot.name : `${sellSlot.team} ${POSITION_LABELS[sellPos!]}`)
    : ''

  const confirmSell = () => {
    if (sellPos) sellPlayer(sellPos)
    setSellPos(null)
  }

  const saveJson = showSave ? buildSaveJson(useGameStore.getState()) : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(saveJson).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Roster</h2>
        <button
          onClick={() => { setShowSave(true); setCopied(false) }}
          className="text-xs font-semibold text-gray-400 hover:text-white px-3 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          💾 Save
        </button>
      </div>
      <RosterSummary roster={roster} />
      <RosterGrid roster={roster} onSell={setSellPos} />

      {sellPos && sellSlot && (
        <ConfirmSellModal
          playerName={playerName}
          refundValue={slotCost(sellSlot)}
          onConfirm={confirmSell}
          onCancel={() => setSellPos(null)}
        />
      )}

      {showSave && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowSave(false)}
        >
          <div
            className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl flex flex-col h-[95vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="text-base font-bold text-white">Save Data</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <button onClick={() => setShowSave(false)} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
              </div>
            </div>
            <textarea
              readOnly
              value={saveJson}
              className="flex-1 overflow-auto bg-gray-950 text-gray-300 text-xs font-mono p-5 resize-none outline-none rounded-b-2xl"
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  )
}
