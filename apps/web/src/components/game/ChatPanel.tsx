'use client'

import { useEffect, useRef, useState } from 'react'
import { GamePhase } from '@mafioso/types'
import type { ChatMessagePayload } from '@mafioso/types'
import { useGameStore } from '@/stores/gameStore'

interface ChatPanelProps {
  sessionId: string
}

export function ChatPanel({ sessionId: _sessionId }: ChatPanelProps) {
  const messages = useGameStore((s) => s.messages)
  const phase = useGameStore((s) => s.phase)
  const isSpectator = useGameStore((s) => s.isSpectator)
  const sendChatMessage = useGameStore((s) => s.sendChatMessage)

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const isNight = phase === GamePhase.NIGHT
  const canChat = isSpectator || !isNight

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || !canChat) return
    sendChatMessage(trimmed)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full border border-gray-700 rounded-lg bg-gray-900 overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300">Chat</span>
        {isSpectator && (
          <span className="text-xs bg-gray-600 text-gray-200 px-2 py-0.5 rounded-full">
            Spectator
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500 text-center mt-4">No messages yet</p>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-700 px-3 py-2 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!canChat}
          maxLength={500}
          placeholder={isNight && !isSpectator ? 'Silent during night...' : 'Say something...'}
          className="flex-1 bg-gray-800 text-gray-100 text-sm rounded px-3 py-1.5 placeholder-gray-500 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!canChat || !input.trim()}
          className="text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}

function ChatMessage({ message }: { message: ChatMessagePayload }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-500 text-xs shrink-0 mt-0.5">{time}</span>
      <div>
        <span className={`font-medium ${message.isSpectator ? 'text-gray-400' : 'text-blue-400'}`}>
          {message.username}
          {message.isSpectator && (
            <span className="ml-1 text-xs bg-gray-700 text-gray-400 px-1 rounded">spectator</span>
          )}
        </span>
        <span className="text-gray-300 ml-1">{message.content}</span>
      </div>
    </div>
  )
}
