'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'
import { useGameStore } from '@/stores/gameStore'
import { api } from '@/lib/api'
import { PhaseDisplay } from '@/components/game/PhaseDisplay'
import { PlayerRoster } from './PlayerRoster'
import { PhaseControls } from './PhaseControls'
import { GameLog } from './GameLog'
import { AnnouncementBar } from './AnnouncementBar'
import { GamePhase, Team } from '@mafioso/types'

interface ModeratorDashboardProps {
  roomCode: string
}

export function ModeratorDashboard({ roomCode }: ModeratorDashboardProps) {
  const phase = useGameStore((s) => s.phase)
  const players = useGameStore((s) => s.players)
  const timer = useGameStore((s) => s.timer)
  const winner = useGameStore((s) => s.winner)
  const [copied, setCopied] = useState(false)

  const currentPhase = phase ?? GamePhase.LOBBY
  const currentWinner = winner === 'MAFIA' ? Team.MAFIA : winner === 'VILLAGE' ? Team.VILLAGE : null

  async function handleCopyInvite() {
    try {
      const res = await api.post<{ inviteUrl: string }>(`/rooms/${roomCode}/invite`)
      await navigator.clipboard.writeText(res.data.inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API may be unavailable in some contexts
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Top bar */}
      <PhaseDisplay phase={currentPhase} timerSeconds={timer} winner={currentWinner} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Room code + invite copy */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Room code</p>
              <p className="text-xl font-bold font-mono tracking-widest text-gray-100">{roomCode}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  Copy invite
                </>
              )}
            </button>
          </div>

          <PlayerRoster
            players={players.map((p) => ({ ...p }))}
            connectedIds={new Set(players.filter((p) => p.isAlive).map((p) => p.id))}
          />
        </div>

        {/* Center column */}
        <div className="lg:col-span-2 space-y-4">
          <PhaseControls roomCode={roomCode} />
          <AnnouncementBar />
          <GameLog roomCode={roomCode} />
        </div>
      </div>
    </div>
  )
}
