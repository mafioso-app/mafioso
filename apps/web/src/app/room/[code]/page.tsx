'use client'

import { useEffect, useState } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { GamePhase, Team } from '@mafioso/types'
import type { RolePayload } from '@mafioso/types'
import { useGameStore } from '@/stores/gameStore'
import { api } from '@/lib/api'
import { PhaseDisplay } from '@/components/game/PhaseDisplay'
import { VotingPanel } from '@/components/game/VotingPanel'
import { NightActionPanel } from '@/components/game/NightActionPanel'
import { ChatPanel } from '@/components/game/ChatPanel'
import { RoleCard } from '@/components/game/RoleCard'
import { AnnouncementBanner } from '@/components/game/AnnouncementBanner'
import { ReconnectingOverlay } from '@/components/game/ReconnectingOverlay'
import { SpectatorBanner } from '@/components/game/SpectatorBanner'
import { LastWordsOverlay } from '@/components/game/LastWordsOverlay'
import { ModeratorDashboard } from '@/components/moderator/ModeratorDashboard'

interface PageProps {
  params: { code: string }
}

interface RoomStatus {
  moderatorId: string
}

function getUserIdFromToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const token = localStorage.getItem('accessToken')
    if (!token) return null
    const segment = token.split('.')[1]
    if (!segment) return null
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      segment.length + ((4 - (segment.length % 4)) % 4),
      '=',
    )
    const json = JSON.parse(atob(padded)) as Record<string, unknown>
    return (json['sub'] as string) ?? null
  } catch {
    return null
  }
}

export default function RoomPage({ params }: PageProps) {
  const { code } = params

  const phase = useGameStore((s) => s.phase)
  const players = useGameStore((s) => s.players)
  const myRole = useGameStore((s) => s.myRole)
  const myId = useGameStore((s) => s.myId)
  const timer = useGameStore((s) => s.timer)
  const votes = useGameStore((s) => s.votes)
  const detectiveResults = useGameStore((s) => s.detectiveResults)
  const winner = useGameStore((s) => s.winner)
  const isSpectator = useGameStore((s) => s.isSpectator)
  const submitNightAction = useGameStore((s) => s.submitNightAction)
  const submitVote = useGameStore((s) => s.submitVote)

  const [isModerator, setIsModerator] = useState(false)
  const [roleModal, setRoleModal] = useState<RolePayload | null>(null)
  const [chatOpen, setChatOpen] = useState(true)
  const [nightActionSubmitted, setNightActionSubmitted] = useState(false)
  const [voteSubmitted, setVoteSubmitted] = useState(false)

  // Reset submitted state on phase change
  useEffect(() => {
    setNightActionSubmitted(false)
    setVoteSubmitted(false)
  }, [phase])

  // Determine moderator status on mount
  useEffect(() => {
    const userId = getUserIdFromToken()
    if (!userId) return

    api
      .get<RoomStatus>(`/rooms/${code}/status`)
      .then((res) => {
        setIsModerator(res.data.moderatorId === userId)
      })
      .catch(() => {})
  }, [code])

  // Listen for role_assigned from gameStore — show modal
  useEffect(() => {
    if (!myRole) return
    const teammates = players
      .filter((p) => p.id !== myId && p.role === 'mafia' && myRole === 'mafia')
      .map((p) => p.username)

    setRoleModal({ role: myRole as RolePayload['role'], teammates })

    const t = setTimeout(() => setRoleModal(null), 5000)
    return () => clearTimeout(t)
  }, [myRole]) // intentionally omitting myId/players — only re-run when role first assigned

  if (isModerator) {
    return (
      <>
        <AnnouncementBanner />
        <ReconnectingOverlay />
        <ModeratorDashboard roomCode={code} />
      </>
    )
  }

  const currentPhase = phase ?? GamePhase.LOBBY
  const currentWinner =
    winner === 'MAFIA' ? Team.MAFIA : winner === 'VILLAGE' ? Team.VILLAGE : null

  const isNight = currentPhase === GamePhase.NIGHT
  const isVoting = currentPhase === GamePhase.DAY_VOTING
  const me = players.find((p) => p.id === myId)

  const showNightPanel = isNight && !!myRole && !!me?.isAlive && !isSpectator
  const showVotePanel = isVoting && !!me?.isAlive && !isSpectator

  // Build detective results with names for display
  const namedResults = detectiveResults.map((r, i) => ({
    targetId: r.targetId,
    targetName: players.find((p) => p.id === r.targetId)?.username ?? r.targetId,
    result: r.result,
    night: i + 1,
  }))

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <AnnouncementBanner />
      <ReconnectingOverlay />
      <LastWordsOverlay />
      <SpectatorBanner />

      {/* Role card modal */}
      {roleModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
          onClick={() => setRoleModal(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="relative">
            <button
              type="button"
              onClick={() => setRoleModal(null)}
              className="absolute -top-3 -right-3 z-10 bg-gray-700 hover:bg-gray-600 rounded-full p-1"
            >
              <X className="w-4 h-4 text-gray-300" />
            </button>
            <RoleCard role={roleModal} teammates={roleModal.teammates} />
          </div>
        </div>
      )}

      {/* Phase banner */}
      <PhaseDisplay phase={currentPhase} timerSeconds={timer} winner={currentWinner} />

      {/* Main layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Left sidebar — player list */}
        <aside className="lg:w-52 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-800 overflow-y-auto">
          <div className="px-3 py-2 border-b border-gray-800">
            <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Players
            </span>
          </div>
          <ul className="py-1">
            {players.map((p) => (
              <li
                key={p.id}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm ${
                  p.id === myId ? 'bg-gray-800/50' : ''
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    p.isAlive ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                />
                <span
                  className={
                    p.isAlive ? 'text-gray-200' : 'line-through text-gray-600'
                  }
                >
                  {p.username}
                  {p.id === myId && (
                    <span className="ml-1 text-xs text-gray-500">(you)</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Center — action panels */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {currentPhase === GamePhase.GAME_OVER && (
              <div className="text-center py-12">
                <p className="text-3xl font-bold text-yellow-300">
                  {currentWinner === Team.MAFIA ? 'Mafia wins!' : 'Village wins!'}
                </p>
              </div>
            )}

            {showNightPanel && myId && (
              <NightActionPanel
                role={myRole!}
                myId={myId}
                players={players}
                onAction={(targetId) => {
                  submitNightAction(targetId, 'investigate')
                  setNightActionSubmitted(true)
                }}
                detectiveResults={namedResults}
                disabled={nightActionSubmitted}
              />
            )}

            {showVotePanel && myId && (
              <VotingPanel
                players={players}
                myId={myId}
                onVote={(targetId) => {
                  submitVote(targetId)
                  setVoteSubmitted(true)
                }}
                disabled={voteSubmitted}
                votes={votes}
              />
            )}

            {currentPhase === GamePhase.DAY_DISCUSSION && (
              <div className="flex items-center justify-center py-6">
                <p className="text-gray-400 text-sm">Discuss with other players...</p>
              </div>
            )}

            {currentPhase === GamePhase.LOBBY && (
              <div className="flex items-center justify-center py-6">
                <p className="text-gray-400 text-sm">Waiting for the moderator to start...</p>
              </div>
            )}
          </div>

          {/* Chat — collapsible on mobile */}
          <div className="border-t border-gray-800">
            {/* Mobile toggle */}
            <button
              type="button"
              className="lg:hidden w-full flex items-center justify-between px-4 py-2 text-sm text-gray-400"
              onClick={() => setChatOpen((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </span>
              <span className="text-xs">{chatOpen ? 'Hide' : 'Show'}</span>
            </button>

            <div
              className={`${chatOpen ? 'block' : 'hidden'} lg:block`}
              style={{ height: '240px' }}
            >
              <ChatPanel sessionId={''} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
