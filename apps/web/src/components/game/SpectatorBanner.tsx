'use client'

import { Eye } from 'lucide-react'
import { useGameStore } from '@/stores/gameStore'

export function SpectatorBanner() {
  const isSpectator = useGameStore((s) => s.isSpectator)

  if (!isSpectator) return null

  return (
    <div className="w-full flex items-center gap-3 px-5 py-2.5 bg-red-950/60 border-b border-red-900">
      <Eye className="w-4 h-4 text-red-400 shrink-0" />
      <p className="text-sm text-red-300">
        You have been eliminated — you are now spectating
      </p>
    </div>
  )
}
