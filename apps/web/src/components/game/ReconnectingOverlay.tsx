'use client'

import { useUiStore } from '@/stores/uiStore'

export function ReconnectingOverlay() {
  const isReconnecting = useUiStore((s) => s.isReconnecting)

  if (!isReconnecting) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/90">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-lg font-semibold text-gray-200">Reconnecting...</p>
        <p className="text-sm text-gray-500">Your game will resume once connected</p>
      </div>
    </div>
  )
}
