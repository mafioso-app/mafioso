'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

interface PageProps {
  params: { token: string }
}

export default function JoinByTokenPage({ params }: PageProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const { token } = params
    api
      .post<{ sessionId: string }>('/rooms/join-by-token', { token })
      .then(async () => {
        // Get room code from token payload (base64 decode middle segment)
        try {
          const segment = token.split('.')[1]
          if (!segment) throw new Error('bad token')
          const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(
            segment.length + ((4 - (segment.length % 4)) % 4),
            '=',
          )
          const payload = JSON.parse(atob(padded)) as Record<string, unknown>
          const roomCode = payload['roomCode'] as string
          router.replace(`/room/${roomCode}`)
        } catch {
          setError('Could not read invite token.')
        }
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } }).response?.status
        if (status === 403 || status === 401) {
          setError('This invite link has expired or is invalid.')
        } else if (status === 409) {
          // Already joined — just redirect
          try {
            const segment = params.token.split('.')[1]
            if (!segment) throw new Error()
            const padded = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(
              segment.length + ((4 - (segment.length % 4)) % 4),
              '=',
            )
            const payload = JSON.parse(atob(padded)) as Record<string, unknown>
            const roomCode = payload['roomCode'] as string
            router.replace(`/room/${roomCode}`)
          } catch {
            setError('Already joined but could not redirect.')
          }
        } else {
          setError('Failed to join room. Please try again.')
        }
      })
  }, [params, router])

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-2xl font-bold text-red-400">Invite expired</p>
          <p className="text-gray-400">{error}</p>
          <a href="/" className="text-blue-400 hover:underline text-sm">
            Return home
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-gray-400">Joining room...</p>
      </div>
    </main>
  )
}
