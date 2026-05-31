import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@mafioso/types'
import { getCachedToken } from './storage'

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: GameSocket | null = null

function getApiUrl(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default
    return (Constants.expoConfig?.extra?.['apiUrl'] as string | undefined) ?? 'http://localhost:3001'
  } catch {
    return 'http://localhost:3001'
  }
}

function createSocket(): GameSocket {
  const base = getApiUrl()
  return io(`${base}/game`, { autoConnect: false }) as GameSocket
}

export function getSocket(): GameSocket {
  if (!socket) socket = createSocket()
  return socket
}

export function connectSocket(): void {
  const token = getCachedToken()
  const s = getSocket()
  s.auth = { token: token ?? '' }
  if (!s.connected) s.connect()
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
