'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProtectedRoute from '../../components/ProtectedRoute'
import { api } from '../../lib/api'
import { getToken } from '../../lib/auth'

function decodeUsername(): string {
  try {
    const token = getToken()
    if (!token) return 'Player'
    const segment = token.split('.')[1]
    if (!segment) return 'Player'
    const padded = segment
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=')
    const json = JSON.parse(atob(padded)) as Record<string, unknown>
    return (json['username'] as string) ?? 'Player'
  } catch {
    return 'Player'
  }
}

function LobbyContent() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [joinMode, setJoinMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const username = decodeUsername()

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) {
      setError('Enter a 6-character room code')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await api.post(`/rooms/${code}/join`)
      router.push(`/room/${code}`)
    } catch {
      setError('Could not join room. Check the code and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gray-950 px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-white">Welcome, {username}</h1>
        <p className="text-gray-400">What would you like to do?</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/create"
          className="rounded-xl bg-red-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-red-700"
        >
          Create Room
        </Link>

        {!joinMode ? (
          <button
            type="button"
            onClick={() => setJoinMode(true)}
            className="rounded-xl border border-gray-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-gray-800"
          >
            Join Room
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-char code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-center text-xl font-mono tracking-widest text-white placeholder-gray-600 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              autoFocus
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setJoinMode(false); setError(null) }}
                className="flex-1 rounded-xl border border-gray-700 py-3 text-sm font-semibold text-gray-400 transition hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleJoin}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Joining…' : 'Join'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default function LobbyPage() {
  return (
    <ProtectedRoute>
      <LobbyContent />
    </ProtectedRoute>
  )
}
