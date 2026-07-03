import type { ReactNode } from 'react'

interface TooltipProps {
  text: string
  children: ReactNode
  position?: 'top' | 'bottom'
}

export function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  return (
    <div className="relative group/tooltip inline-block">
      {children}
      <div
        className={`absolute ${
          position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
        } left-1/2 -translate-x-1/2 z-50 pointer-events-none w-max max-w-[200px]`}
      >
        <div className="opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 bg-gray-900 text-white text-xs font-normal leading-snug rounded px-2.5 py-1.5 border border-gray-700 shadow-lg text-center">
          {text}
        </div>
      </div>
    </div>
  )
}
