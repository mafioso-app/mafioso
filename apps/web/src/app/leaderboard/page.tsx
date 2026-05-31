'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface LeaderboardEntry {
  userId: string
  username: string
  gamesPlayed: number
  wins: number
  losses: number
  winRate: number
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<LeaderboardEntry[]>('/leaderboard')
      .then((res) => setEntries(res.data))
      .catch(() => setError('Failed to load leaderboard'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Leaderboard</h1>

        {loading && (
          <p className="text-center text-gray-500">Loading...</p>
        )}

        {error && (
          <p className="text-center text-red-400">{error}</p>
        )}

        {!loading && !error && entries.length === 0 && (
          <p className="text-center text-gray-500">No games played yet.</p>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-gray-400 uppercase text-xs tracking-wide">
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Player</th>
                  <th className="px-4 py-3 text-right">Played</th>
                  <th className="px-4 py-3 text-right">Wins</th>
                  <th className="px-4 py-3 text-right">Losses</th>
                  <th className="px-4 py-3 text-right">Win %</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={entry.userId}
                    className="border-t border-gray-800 hover:bg-gray-900 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-100">{entry.username}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{entry.gamesPlayed}</td>
                    <td className="px-4 py-3 text-right text-green-400 font-semibold">{entry.wins}</td>
                    <td className="px-4 py-3 text-right text-red-400">{entry.losses}</td>
                    <td className="px-4 py-3 text-right">
                      <WinRateBadge rate={entry.winRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

function WinRateBadge({ rate }: { rate: number }) {
  const color =
    rate >= 60
      ? 'text-green-400'
      : rate >= 40
        ? 'text-yellow-400'
        : 'text-red-400'
  return <span className={`font-semibold ${color}`}>{rate}%</span>
}
