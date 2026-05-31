'use client'

import { Wifi, WifiOff } from 'lucide-react'
import type { ClientPlayerState } from '@mafioso/types'

interface RosterPlayer extends ClientPlayerState {
  connectedAt?: number
  eliminatedAt?: number
}

interface PlayerRosterProps {
  players: RosterPlayer[]
  connectedIds: Set<string>
}

export function PlayerRoster({ players, connectedIds }: PlayerRosterProps) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-700">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Players ({players.length})
        </h3>
      </div>

      <ul className="divide-y divide-gray-800">
        {players.map((player) => {
          const isConnected = connectedIds.has(player.id)
          const isDead = !player.isAlive

          return (
            <li
              key={player.id}
              className={`flex items-center justify-between px-4 py-2.5 ${
                isDead ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Connection status */}
                {isConnected ? (
                  <Wifi className="w-3.5 h-3.5 text-green-500 shrink-0" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                )}

                <div className="min-w-0">
                  <span
                    className={`text-sm font-medium ${
                      isDead ? 'line-through text-gray-500' : 'text-gray-100'
                    }`}
                  >
                    {player.username}
                  </span>
                  {player.role && (
                    <span className="ml-2 text-xs capitalize text-gray-400">{player.role}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isDead ? (
                  <span className="text-xs text-red-400 font-medium">Eliminated</span>
                ) : (
                  <span className="text-xs text-green-400 font-medium">Alive</span>
                )}
                <span className="text-xs text-gray-600">#{player.seat}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
