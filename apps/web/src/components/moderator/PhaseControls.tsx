'use client'

import { useState } from 'react'
import { Play, SkipForward, StopCircle, Pause, Timer } from 'lucide-react'
import { api } from '@/lib/api'

interface PhaseControlsProps {
  roomCode: string
  onAdvance?: () => void
  onForceEnd?: () => void
}

interface ConfirmDialog {
  title: string
  description: string
  onConfirm: () => void
}

export function PhaseControls({ roomCode, onAdvance, onForceEnd }: PhaseControlsProps) {
  const [dialog, setDialog] = useState<ConfirmDialog | null>(null)
  const [timerDuration, setTimerDuration] = useState(60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function ask(d: ConfirmDialog) {
    setDialog(d)
  }

  async function handleStartGame() {
    setLoading(true)
    setError(null)
    try {
      await api.post(`/rooms/${roomCode}/start`)
    } catch {
      setError('Failed to start game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
        Phase Controls
      </h3>

      <div className="flex flex-wrap gap-2">
        <ControlButton
          icon={<Play className="w-4 h-4" />}
          label="Start Game"
          color="bg-green-700 hover:bg-green-600"
          disabled={loading}
          onClick={() =>
            ask({
              title: 'Start Game?',
              description: 'This will assign roles and begin Night 1.',
              onConfirm: handleStartGame,
            })
          }
        />
        <ControlButton
          icon={<SkipForward className="w-4 h-4" />}
          label="Advance Phase"
          color="bg-blue-700 hover:bg-blue-600"
          disabled={loading}
          onClick={() =>
            ask({
              title: 'Advance Phase?',
              description: 'Skip to the next phase immediately.',
              onConfirm: () => onAdvance?.(),
            })
          }
        />
        <ControlButton
          icon={<StopCircle className="w-4 h-4" />}
          label="Force End"
          color="bg-red-800 hover:bg-red-700"
          disabled={loading}
          onClick={() =>
            ask({
              title: 'Force End Game?',
              description: 'This will immediately end the game with no winner.',
              onConfirm: () => onForceEnd?.(),
            })
          }
        />
      </div>

      {/* Timer controls */}
      <div className="border-t border-gray-700 pt-3">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
          <Timer className="w-3.5 h-3.5" />
          Timer duration (seconds)
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={10}
            max={600}
            value={timerDuration}
            onChange={(e) => setTimerDuration(Number(e.target.value))}
            className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            className="flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded transition-colors"
            onClick={() =>
              ask({
                title: 'Pause Timer?',
                description: 'Timer will be paused until resumed.',
                onConfirm: () => {},
              })
            }
          >
            <Pause className="w-3.5 h-3.5" />
            Pause
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Confirmation dialog */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 shadow-2xl">
            <h4 className="text-base font-bold text-gray-100 mb-2">{dialog.title}</h4>
            <p className="text-sm text-gray-400 mb-5">{dialog.description}</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="text-sm px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="text-sm px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white font-semibold transition-colors"
                onClick={() => {
                  dialog.onConfirm()
                  setDialog(null)
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ControlButton({
  icon,
  label,
  color,
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  color: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
    >
      {icon}
      {label}
    </button>
  )
}
