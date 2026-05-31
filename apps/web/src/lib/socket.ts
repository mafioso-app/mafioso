'use client'

import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@mafioso/types'

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: GameSocket | null = null

function createSocket(): GameSocket {
  const base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'
  return io(`${base}/game`, { autoConnect: false })
}

export function getSocket(): GameSocket {
  if (!socket) socket = createSocket()
  return socket
}

export function connectSocket(token: string): void {
  const s = getSocket()
  s.auth = { token }
  s.connect()
}

export function disconnectSocket(): void {
  socket?.disconnect()
}
