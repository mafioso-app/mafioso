'use client'

import { useEffect, useState } from 'react'
import { Shield, Skull, Eye, Heart, Star } from 'lucide-react'
import type { RolePayload } from '@mafioso/types'

interface RoleCardProps {
  role: RolePayload
  teammates?: string[]
}

const ROLE_META: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; team: string; description: string }
> = {
  mafia: {
    icon: <Skull className="w-10 h-10" />,
    color: 'text-red-400',
    bg: 'bg-red-950 border-red-700',
    team: 'MAFIA',
    description: 'Kill one villager each night. Win when mafia equals village.',
  },
  villager: {
    icon: <Shield className="w-10 h-10" />,
    color: 'text-green-400',
    bg: 'bg-green-950 border-green-700',
    team: 'VILLAGE',
    description: 'Find and eliminate all mafia members by day vote.',
  },
  detective: {
    icon: <Eye className="w-10 h-10" />,
    color: 'text-blue-400',
    bg: 'bg-blue-950 border-blue-700',
    team: 'VILLAGE',
    description: 'Investigate one player each night: mafia or not mafia.',
  },
  doctor: {
    icon: <Heart className="w-10 h-10" />,
    color: 'text-pink-400',
    bg: 'bg-pink-950 border-pink-700',
    team: 'VILLAGE',
    description: 'Save one player from elimination each night.',
  },
  sheriff: {
    icon: <Star className="w-10 h-10" />,
    color: 'text-yellow-400',
    bg: 'bg-yellow-950 border-yellow-700',
    team: 'VILLAGE',
    description: 'Investigate on odd nights only — reveals exact role.',
  },
}

const FALLBACK_META = {
  icon: <Shield className="w-10 h-10" />,
  color: 'text-gray-400',
  bg: 'bg-gray-800 border-gray-600',
  team: 'VILLAGE',
  description: 'Play your role wisely.',
}

export function RoleCard({ role, teammates }: RoleCardProps) {
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 150)
    return () => clearTimeout(t)
  }, [])

  const meta = ROLE_META[role.role] ?? FALLBACK_META
  const isMafia = role.role === 'mafia'

  return (
    <div className="flex flex-col items-center gap-4">
      {/* flip container */}
      <div
        className="w-56 h-80 cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className="relative w-full h-full transition-transform duration-700"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Back face */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-gray-600 bg-gray-800 flex items-center justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-500">?</span>
            </div>
          </div>

          {/* Front face */}
          <div
            className={`absolute inset-0 rounded-2xl border-2 ${meta.bg} flex flex-col items-center justify-center gap-3 px-4`}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className={meta.color}>{meta.icon}</div>
            <h2 className={`text-2xl font-bold capitalize tracking-wide ${meta.color}`}>
              {role.role}
            </h2>
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              {meta.team}
            </span>
            <p className="text-center text-sm text-gray-300 leading-snug">{meta.description}</p>
          </div>
        </div>
      </div>

      {isMafia && teammates && teammates.length > 0 && (
        <div className="w-56 rounded-xl border border-red-800 bg-red-950/60 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-red-400 font-semibold mb-2">
            Your team
          </p>
          <ul className="space-y-1">
            {teammates.map((name) => (
              <li key={name} className="flex items-center gap-2 text-sm text-red-200">
                <Skull className="w-3.5 h-3.5 text-red-500 shrink-0" />
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-500">Click card to flip</p>
    </div>
  )
}
