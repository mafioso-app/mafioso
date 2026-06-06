'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../lib/api'
import { saveToken } from '../../lib/auth'

export default function GuestPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = username.trim()
    if (name.length < 2) {
      setError('Username must be at least 2 characters')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await api.post<{ accessToken: string }>('/auth/guest', { username: name })
      saveToken(res.data.accessToken)
      router.push('/lobby')
    } catch {
      setError('Could not create guest session. Try a different username.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Play as Guest</h1>
          <p className="mt-2 text-gray-400">Choose a display name to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-gray-900 p-8 shadow-lg">
          {error && (
            <div className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="off"
              required
              minLength={2}
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="cool_player"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Joining…' : 'Play Now'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Have an account?{' '}
          <Link href="/login" className="text-red-400 hover:text-red-300">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
