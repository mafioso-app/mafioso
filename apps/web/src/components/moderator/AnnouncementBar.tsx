'use client'

import { useState } from 'react'
import { Megaphone } from 'lucide-react'
import { getSocket } from '@/lib/socket'

export function AnnouncementBar() {
  const [message, setMessage] = useState('')

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return
    getSocket().emit('moderator_announce', { message: trimmed })
    setMessage('')
  }

  return (
    <form
      onSubmit={handleSend}
      className="flex items-center gap-2 bg-yellow-950/50 border border-yellow-800 rounded-xl px-4 py-3"
    >
      <Megaphone className="w-4 h-4 text-yellow-400 shrink-0" />
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Announce to all players..."
        maxLength={300}
        className="flex-1 bg-transparent text-sm text-yellow-100 placeholder-yellow-700 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!message.trim()}
        className="text-sm font-semibold bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-colors"
      >
        Send
      </button>
    </form>
  )
}
