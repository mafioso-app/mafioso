'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'

interface PageProps {
  params: { token: string }
}

function decodeRoomCode(token: string): string | null {
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    const padded = segment
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>
    return (payload['roomCode'] as string) ?? null
  } catch {
    return null
  }
}

export default function JoinByTokenPage({ params }: PageProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const { token } = params

    // If not authenticated, save destination and redirect to login
    if (!isAuthenticated()) {
      const destination = `/join/${token}`
      sessionStorage.setItem('postLoginRedirect', destination)
      router.replace(`/login?redirect=${encodeURIComponent(destination)}`)
      return
    }

    api
      .post<{ sessionId: string; id: string }>('/rooms/join-by-token', { token })
      .then(() => {
        const roomCode = decodeRoomCode(token)
        if (roomCode) {
          router.replace(`/room/${roomCode}`)
        } else {
          setError('Could not read invite token.')
        }
      })
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number; data?: { message?: string } } }).response?.status
        const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message

        if (status === 401 || status === 403) {
          setError('This invite link has expired or is invalid.')
        } else if (status === 409) {
          // Already joined — just redirect
          const roomCode = decodeRoomCode(token)
          if (roomCode) {
            router.replace(`/room/${roomCode}`)
          } else {
            setError('Already joined but could not redirect.')
          }
        } else if (status === 400 && message) {
          setError(message)
        } else {
          setError('Failed to join room. Please try again.')
        }
      })
  }, [params, router])

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-2xl font-bold text-red-400">Could not join</p>
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
