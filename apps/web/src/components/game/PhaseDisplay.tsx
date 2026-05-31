'use client'

import { Moon, Sun, Vote, Trophy } from 'lucide-react'
import { GamePhase, Team } from '@mafioso/types'

interface PhaseDisplayProps {
  phase: GamePhase
  timerSeconds: number
  winner?: Team | null
}

interface PhaseMeta {
  label: string
  icon: React.ReactNode
  bg: string
  text: string
  border: string
}

const PHASE_META: Record<GamePhase, PhaseMeta> = {
  [GamePhase.LOBBY]: {
    label: 'Lobby',
    icon: null,
    bg: 'bg-gray-800',
    text: 'text-gray-300',
    border: 'border-gray-700',
  },
  [GamePhase.NIGHT]: {
    label: 'Night',
    icon: <Moon className="w-5 h-5" />,
    bg: 'bg-indigo-950',
    text: 'text-indigo-200',
    border: 'border-indigo-800',
  },
  [GamePhase.DAY_DISCUSSION]: {
    label: 'Discussion',
    icon: <Sun className="w-5 h-5" />,
    bg: 'bg-amber-900',
    text: 'text-amber-100',
    border: 'border-amber-700',
  },
  [GamePhase.DAY_VOTING]: {
    label: 'Voting',
    icon: <Vote className="w-5 h-5" />,
    bg: 'bg-red-950',
    text: 'text-red-200',
    border: 'border-red-800',
  },
  [GamePhase.GAME_OVER]: {
    label: 'Game Over',
    icon: <Trophy className="w-5 h-5" />,
    bg: 'bg-gray-900',
    text: 'text-gray-200',
    border: 'border-gray-700',
  },
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function PhaseDisplay({ phase, timerSeconds, winner }: PhaseDisplayProps) {
  const meta = PHASE_META[phase]
  const showTimer =
    timerSeconds > 0 && phase !== GamePhase.LOBBY && phase !== GamePhase.GAME_OVER
  const isUrgent = showTimer && timerSeconds <= 10

  const winnerLabel =
    phase === GamePhase.GAME_OVER && winner
      ? winner === Team.MAFIA
        ? 'Mafia wins!'
        : 'Village wins!'
      : null

  return (
    <div
      className={`w-full flex items-center justify-between px-5 py-3 border-b ${meta.bg} ${meta.border}`}
    >
      <div className={`flex items-center gap-2 font-bold text-lg uppercase tracking-wide ${meta.text}`}>
        {meta.icon}
        <span>{meta.label}</span>
      </div>

      <div className="flex items-center gap-4">
        {winnerLabel && (
          <span className="text-sm font-semibold text-yellow-300">{winnerLabel}</span>
        )}

        {showTimer && (
          <span
            className={`font-mono text-base font-semibold tabular-nums ${
              isUrgent ? 'text-red-400 animate-pulse' : meta.text
            }`}
          >
            {formatTimer(timerSeconds)}
          </span>
        )}
      </div>
    </div>
  )
}
