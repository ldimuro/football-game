interface StatBarProps {
  label: string
  value: string | number
  subLabel?: string
}

export function StatBar({ label, value, subLabel }: StatBarProps) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-white">{value}</span>
        {subLabel && <span className="ml-1 text-xs text-gray-500">{subLabel}</span>}
      </div>
    </div>
  )
}
