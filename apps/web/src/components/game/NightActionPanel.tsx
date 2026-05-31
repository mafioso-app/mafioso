'use client'

import { useState } from 'react'
import { Check, Heart, Eye, Skull, Star, Users } from 'lucide-react'
import type { ClientPlayerState } from '@mafioso/types'

export interface DetectiveResult {
  targetId: string
  targetName: string
  result: string
  night: number
}

interface NightActionPanelProps {
  role: string
  myId: string
  players: ClientPlayerState[]
  onAction: (targetId: string) => void
  detectiveResults: DetectiveResult[]
  disabled: boolean
  teamTarget?: string | null
}

const ROLES_WITH_NIGHT_ACTION = new Set(['mafia', 'detective', 'doctor', 'sheriff'])

const ROLE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; includeSelf: boolean; color: string }
> = {
  doctor: {
    label: 'Choose who to save',
    icon: <Heart className="w-4 h-4" />,
    includeSelf: true,
    color: 'border-pink-500 bg-pink-950/40 text-pink-200',
  },
  detective: {
    label: 'Choose who to investigate',
    icon: <Eye className="w-4 h-4" />,
    includeSelf: false,
    color: 'border-blue-500 bg-blue-950/40 text-blue-200',
  },
  mafia: {
    label: 'Choose who to eliminate',
    icon: <Skull className="w-4 h-4" />,
    includeSelf: false,
    color: 'border-red-500 bg-red-950/40 text-red-200',
  },
  sheriff: {
    label: 'Choose who to investigate',
    icon: <Star className="w-4 h-4" />,
    includeSelf: false,
    color: 'border-yellow-500 bg-yellow-950/40 text-yellow-200',
  },
}

export function NightActionPanel({
  role,
  myId,
  players,
  onAction,
  detectiveResults,
  disabled,
  teamTarget,
}: NightActionPanelProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (!ROLES_WITH_NIGHT_ACTION.has(role)) return null

  const config = ROLE_CONFIG[role]
  if (!config) return null

  const candidates = players.filter((p) => {
    if (!p.isAlive) return false
    if (!config.includeSelf && p.id === myId) return false
    return true
  })

  const isFullyDisabled = disabled || submitted

  function handleConfirm() {
    if (!selected || isFullyDisabled) return
    onAction(selected)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 bg-gray-900 rounded-xl border border-gray-700">
        <div className="flex items-center gap-2 text-green-400">
          <Check className="w-5 h-5" />
          <span className="font-semibold">Action submitted</span>
        </div>
        <p className="text-sm text-gray-400">Waiting for the night to end...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 bg-gray-900 rounded-xl border border-gray-700 p-4">
      <div className="flex items-center gap-2">
        <span className="text-gray-300">{config.icon}</span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          {config.label}
        </h3>
      </div>

      {/* Mafia: show if team already has a target */}
      {role === 'mafia' && teamTarget && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-950/40 border border-red-800 rounded-lg text-sm text-red-300">
          <Users className="w-4 h-4 shrink-0" />
          <span>
            Your team&apos;s target:{' '}
            <span className="font-semibold">
              {players.find((p) => p.id === teamTarget)?.username ?? teamTarget}
            </span>
          </span>
        </div>
      )}

      <ul className="space-y-2">
        {candidates.map((player) => {
          const isSelected = selected === player.id
          return (
            <li key={player.id}>
              <button
                type="button"
                disabled={isFullyDisabled}
                onClick={() => setSelected(player.id)}
                className={[
                  'w-full flex items-center px-4 py-2.5 rounded-lg border text-left transition-colors',
                  isSelected ? config.color : 'border-gray-700 bg-gray-800 hover:border-gray-500 text-gray-200',
                  isFullyDisabled ? 'opacity-60 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {player.username}
                {player.id === myId && (
                  <span className="ml-2 text-xs text-gray-500">(you)</span>
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
        className="mt-1 w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        Confirm Action
      </button>

      {/* Past investigation results for detective / sheriff */}
      {(role === 'detective' || role === 'sheriff') && detectiveResults.length > 0 && (
        <div className="mt-2 border-t border-gray-700 pt-3">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Past investigations</p>
          <ul className="space-y-1 max-h-36 overflow-y-auto">
            {detectiveResults.map((r, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-xs px-3 py-1.5 bg-gray-800 rounded"
              >
                <span className="text-gray-300">
                  Night {r.night}: <span className="font-medium">{r.targetName}</span>
                </span>
                <span
                  className={
                    r.result === 'mafia'
                      ? 'text-red-400 font-semibold'
                      : 'text-green-400 font-semibold'
                  }
                >
                  {r.result}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
