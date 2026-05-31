import React, { useEffect, useRef } from 'react'
import { connectSocket, getSocket, disconnectSocket } from '../../lib/socket'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import { scheduleLocalNotification } from '../../lib/notifications'
import type { PhaseChangePayload } from '@mafioso/types'
import { GamePhase } from '@mafioso/types'

const NIGHT_ACTION_ROLES = new Set(['mafia', 'detective', 'doctor', 'sheriff'])

interface SocketProviderProps {
  roomCode: string
  children: React.ReactNode
}

export function SocketProvider({ roomCode, children }: SocketProviderProps) {
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    connectSocket()
    const socket = getSocket()

    const handleAny = (type: string, payload: unknown) => {
      useGameStore.getState().handleSocketEvent(type, payload)

      if (type === 'state_sync') {
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current)
          disconnectTimerRef.current = null
        }
        useUiStore.getState().setReconnecting(false)
      }

      if (type === 'phase_change') {
        const p = payload as PhaseChangePayload
        const myRole = useGameStore.getState().myRole

        if (p.phase === GamePhase.NIGHT && myRole && NIGHT_ACTION_ROLES.has(myRole)) {
          void scheduleLocalNotification('Mafioso', 'Night has fallen — take your action')
        }
        if (p.phase === GamePhase.DAY_VOTING) {
          void scheduleLocalNotification('Mafioso', 'Voting has begun — cast your vote')
        }
      }
    }

    const handleConnect = () => {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current)
        disconnectTimerRef.current = null
      }
      socket.emit('reconnect_state', { roomCode })
    }

    const handleDisconnect = () => {
      disconnectTimerRef.current = setTimeout(() => {
        useUiStore.getState().setReconnecting(true)
      }, 2000)
    }

    socket.onAny(handleAny)
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)

    socket.emit('join_room', { roomCode })

    return () => {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current)
      socket.offAny(handleAny)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      disconnectSocket()
      useGameStore.getState().reset()
    }
  }, [roomCode])

  return <>{children}</>
}
