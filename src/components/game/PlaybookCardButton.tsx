import type { PlaybookCard } from '../../types'

interface PlaybookCardButtonProps {
  card: PlaybookCard
  onClick: () => void
  disabled?: boolean
}

export function PlaybookCardButton({ card, onClick, disabled }: PlaybookCardButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 rounded-xl p-4 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed w-full"
    >
      <p className="font-bold text-white text-sm leading-tight">{card.name}</p>
      <p className="text-gray-400 text-xs mt-1 leading-snug">{card.description}</p>
    </button>
  )
}
