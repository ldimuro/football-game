interface BadgeProps {
  label: string
  color?: 'gray' | 'green' | 'yellow' | 'red' | 'blue'
}

const COLORS = {
  gray: 'bg-gray-700 text-gray-200',
  green: 'bg-green-800 text-green-200',
  yellow: 'bg-yellow-800 text-yellow-200',
  red: 'bg-red-800 text-red-200',
  blue: 'bg-blue-800 text-blue-200',
}

export function Badge({ label, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${COLORS[color]}`}>
      {label}
    </span>
  )
}
