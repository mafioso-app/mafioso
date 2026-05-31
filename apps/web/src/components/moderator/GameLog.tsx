'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

interface GameEvent {
  id: string
  sequence: number
  type: string
  actorId: string | null
  targetId: string | null
  payload: Record<string, unknown>
  createdAt: string
}

interface GameLogProps {
  roomCode: string
}

function formatEventLabel(event: GameEvent): string {
  const time = new Date(event.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  const payload = event.payload

  const descriptions: Record<string, (p: Record<string, unknown>) => string> = {
    GAME_STARTED: () => 'Game started',
    PHASE_CHANGED: (p) => `Phase changed to ${String(p['phase'] ?? '')}`,
    NIGHT_ACTION: (p) => `${String(p['actorRole'] ?? 'Player')} acted on ${String(p['targetName'] ?? 'someone')}`,
    ELIMINATION: (p) => `${String(p['targetName'] ?? 'Player')} was eliminated (${String(p['role'] ?? '?')})`,
    VOTE_CAST: (p) => `Vote cast against ${String(p['targetName'] ?? 'someone')}`,
    SAVE: (p) => `Doctor saved ${String(p['targetName'] ?? 'someone')}`,
    GAME_OVER: (p) => `Game over — ${String(p['winner'] ?? '?')} wins`,
  }

  const fn = descriptions[event.type]
  const description = fn ? fn(payload) : event.type.replace(/_/g, ' ').toLowerCase()
  return `${time} — ${description}`
}

export function GameLog({ roomCode }: GameLogProps) {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchEvents() {
      try {
        const res = await api.get<{ events: GameEvent[] }>(`/rooms/${roomCode}/events`)
        if (!cancelled) setEvents(res.data.events)
      } catch {
        if (!cancelled) setError('Could not load events')
      }
    }

    fetchEvents()
    const interval = setInterval(fetchEvents, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [roomCode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 flex flex-col h-64">
      <div className="px-4 py-2 border-b border-gray-700 shrink-0">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Game Log</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 min-h-0">
        {error && <p className="text-xs text-red-400">{error}</p>}
        {events.length === 0 && !error && (
          <p className="text-xs text-gray-500 text-center mt-4">No events yet</p>
        )}
        {events.map((event) => (
          <p key={event.id} className="text-xs text-gray-300 font-mono leading-relaxed">
            {formatEventLabel(event)}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
