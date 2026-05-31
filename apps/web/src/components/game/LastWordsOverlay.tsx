'use client'

import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { useGameStore } from '@/stores/gameStore'

export function LastWordsOverlay() {
  const lastWords = useGameStore((s) => s.lastWords)
  const myId = useGameStore((s) => s.myId)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (!lastWords) {
      setRemaining(0)
      return
    }

    setRemaining(lastWords.seconds)
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [lastWords])

  if (!lastWords) return null

  const isMe = lastWords.playerId === myId

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80">
      <div className="flex flex-col items-center gap-6 px-8 py-10 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <MessageSquare className="w-10 h-10 text-amber-400" />
          <h2 className="text-xl font-bold text-gray-100">
            {isMe ? 'Your last words' : `${lastWords.playerName}'s last words`}
          </h2>
          <p className="text-sm text-gray-400">
            {isMe
              ? 'You have been eliminated. Say your piece.'
              : `${lastWords.playerName} has been eliminated and has a moment to speak.`}
          </p>
        </div>

        {/* Countdown ring */}
        <div className="relative flex items-center justify-center w-20 h-20">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#374151"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - remaining / lastWords.seconds)}`}
              className="transition-all duration-1000"
            />
          </svg>
          <span className="text-2xl font-bold tabular-nums text-amber-400">{remaining}</span>
        </div>

        <p className="text-xs text-gray-500">Chat is open during this window</p>
      </div>
    </div>
  )
}
