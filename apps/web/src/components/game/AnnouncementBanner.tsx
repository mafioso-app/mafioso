'use client'

import { Megaphone } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'

export function AnnouncementBanner() {
  const announcement = useUiStore((s) => s.announcement)

  if (!announcement) return null

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center px-4 pt-4 pointer-events-none">
      <div className="w-full max-w-2xl flex items-center gap-3 bg-yellow-900 border border-yellow-600 text-yellow-100 rounded-xl shadow-2xl px-5 py-3 animate-in fade-in slide-in-from-top-4 duration-300">
        <Megaphone className="w-5 h-5 text-yellow-400 shrink-0" />
        <p className="text-sm font-semibold">{announcement}</p>
      </div>
    </div>
  )
}
