import { faceColorClass } from '../../logic/diceGen'

interface DieFacesProps {
  faces: number[]
}

export function DieFaces({ faces }: DieFacesProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {faces.map((value, i) => (
        <div
          key={i}
          className={`flex items-center justify-center border-2 rounded-lg aspect-square font-bold text-base ${faceColorClass(value)}`}
        >
          {value}
        </div>
      ))}
    </div>
  )
}
