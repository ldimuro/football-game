import { faceColorClass } from '../../logic/diceGen'
import { useGameStore } from '../../store/gameStore'

interface DieFacesProps {
  faces: number[]
  dangerFaces?: number[]
  highlightedIndex?: number | null
}

export function DieFaces({ faces, dangerFaces, highlightedIndex }: DieFacesProps) {
  const scheme = useGameStore(s => s.dieColorScheme)
  const scanning = highlightedIndex != null
  return (
    <div className="grid grid-cols-6 gap-1">
      {faces.map((value, i) => {
        const isDanger = dangerFaces?.includes(value) ?? false
        const isHighlighted = scanning && highlightedIndex === i
        return (
          <div
            key={i}
            className={`flex items-center justify-center rounded-lg aspect-square font-bold text-sm transition-opacity ${
              scanning && !isHighlighted ? 'opacity-25' : 'opacity-100'
            } ${
              isDanger
                ? 'bg-black border-2 border-white text-white'
                : faceColorClass(value, scheme)
            } ${
              isHighlighted ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : ''
            }`}
          >
            {value}
          </div>
        )
      })}
    </div>
  )
}
