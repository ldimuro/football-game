import { dieColorClass } from '../../logic/diceGen'

interface DieFacesProps {
  faces: number[]
  rating?: number
}

export function DieFaces({ faces, rating }: DieFacesProps) {
  const colorClass = dieColorClass(rating)
  return (
    <div className="grid grid-cols-3 gap-2">
      {faces.map((value, i) => (
        <div
          key={i}
          className={`flex items-center justify-center border-2 rounded-lg aspect-square font-bold text-base ${colorClass}`}
        >
          {value}
        </div>
      ))}
    </div>
  )
}
