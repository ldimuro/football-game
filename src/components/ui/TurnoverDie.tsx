export function TurnoverDie({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-black border-2 border-white text-white text-xs font-bold tabular-nums select-none">
      {value}
    </span>
  )
}
