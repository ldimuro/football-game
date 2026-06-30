import { faceColorClass } from '../../logic/diceGen'

interface DieFacesProps {
  faces: number[]
}

export function DieFaces({ faces }: DieFacesProps) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {faces.map((value, i) => (
        <div
          key={i}
          className={`flex items-center justify-center rounded-lg aspect-square font-bold text-sm text-gray-900 dark:text-white ${faceColorClass(value)}`}
        >
          {value}
        </div>
      ))}
    </div>
  )
}
