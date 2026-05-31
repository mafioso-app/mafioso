'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { ClientPlayerState, VotePayload } from '@mafioso/types'

interface VotingPanelProps {
  players: ClientPlayerState[]
  myId: string
  onVote: (targetId: string) => void
  disabled: boolean
  votes: VotePayload[]
}

function aggregateVotes(votes: VotePayload[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const payload of votes) {
    for (const targetId of Object.values(payload.votes)) {
      counts[targetId] = (counts[targetId] ?? 0) + 1
    }
  }
  return counts
}

export function VotingPanel({ players, myId, onVote, disabled, votes }: VotingPanelProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const voteCounts = aggregateVotes(votes)
  const isFullyDisabled = disabled || submitted

  function handleConfirm() {
    if (!selected || isFullyDisabled) return
    onVote(selected)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 bg-gray-900 rounded-xl border border-gray-700">
        <div className="flex items-center gap-2 text-green-400">
          <Check className="w-5 h-5" />
          <span className="font-semibold">Vote submitted</span>
        </div>
        <p className="text-sm text-gray-400">Waiting for others to vote...</p>
      </div>
    )
  }

  const candidates = players.filter((p) => p.id !== myId)

  return (
    <div className="flex flex-col gap-3 bg-gray-900 rounded-xl border border-gray-700 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
        Vote to eliminate
      </h3>

      <ul className="space-y-2">
        {candidates.map((player) => {
          const count = voteCounts[player.id] ?? 0
          const isSelected = selected === player.id
          const isDead = !player.isAlive

          return (
            <li key={player.id}>
              <button
                type="button"
                disabled={isDead || isFullyDisabled}
                onClick={() => !isDead && setSelected(player.id)}
                className={[
                  'w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-left transition-colors',
                  isDead
                    ? 'opacity-40 cursor-not-allowed border-gray-700 bg-gray-800'
                    : isSelected
                    ? 'border-red-500 bg-red-950/40 text-red-200'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-500 text-gray-200',
                ].join(' ')}
              >
                <span className={isDead ? 'line-through text-gray-500' : ''}>
                  {player.username}
                </span>
                {count > 0 && (
                  <span className="text-xs font-mono bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                    {count} {count === 1 ? 'vote' : 'votes'}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!selected || isFullyDisabled}
        className="mt-1 w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        Confirm Vote
      </button>
    </div>
  )
}
