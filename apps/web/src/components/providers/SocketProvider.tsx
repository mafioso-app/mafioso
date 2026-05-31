'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getSocket, connectSocket } from '@/lib/socket'
import { useGameStore } from '@/stores/gameStore'
import { useUiStore } from '@/stores/uiStore'

function extractRoomCode(pathname: string): string | null {
  const match = pathname.match(/\/room\/([^/]+)/)
  return match?.[1] ?? null
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : ''
    connectSocket(token)

    const socket = getSocket()

    // 2-second delay before showing reconnecting overlay (avoids flash on brief drops)
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null

    const handleAny = (type: string, payload: unknown) => {
      useGameStore.getState().handleSocketEvent(type, payload)
      // Hide reconnecting overlay only after we have fresh data from server
      if (type === 'state_sync') {
        if (disconnectTimer) {
          clearTimeout(disconnectTimer)
          disconnectTimer = null
        }
        useUiStore.getState().setReconnecting(false)
      }
    }

    const handleConnect = () => {
      // Clear pending disconnect overlay timer
      if (disconnectTimer) {
        clearTimeout(disconnectTimer)
        disconnectTimer = null
      }
      const code = extractRoomCode(pathname)
      if (code) {
        socket.emit('reconnect_state', { roomCode: code })
      }
      // Do NOT clear reconnecting overlay here — wait for state_sync to confirm data arrived
    }

    const handleDisconnect = () => {
      // Wait 2s before showing overlay — avoids flash for transient drops
      disconnectTimer = setTimeout(() => {
        useUiStore.getState().setReconnecting(true)
      }, 2000)
    }

    socket.onAny(handleAny)
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    return () => {
      if (disconnectTimer) clearTimeout(disconnectTimer)
      socket.offAny(handleAny)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
    }
  }, [pathname])

  return <>{children}</>
}
