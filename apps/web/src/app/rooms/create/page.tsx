'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

interface CreateRoomForm {
  onSiteMode: boolean
  doctorCanSaveSelf: boolean
  tieVoteRule: 'no_elimination' | 'random' | 'revote'
  nightDurationSeconds: number
  dayDiscussionDurationSeconds: number
  dayVotingDurationSeconds: number
  enableSheriff: boolean
}

const defaults: CreateRoomForm = {
  onSiteMode: false,
  doctorCanSaveSelf: true,
  tieVoteRule: 'no_elimination',
  nightDurationSeconds: 60,
  dayDiscussionDurationSeconds: 120,
  dayVotingDurationSeconds: 60,
  enableSheriff: false,
}

export default function CreateRoomPage() {
  const router = useRouter()
  const [form, setForm] = useState<CreateRoomForm>(defaults)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      onSiteMode: form.onSiteMode,
      doctorCanSaveSelf: form.doctorCanSaveSelf,
      tieVoteRule: form.tieVoteRule,
      nightDurationSeconds: form.nightDurationSeconds,
      dayDiscussionDurationSeconds: form.dayDiscussionDurationSeconds,
      dayVotingDurationSeconds: form.dayVotingDurationSeconds,
      enabledRoles: form.enableSheriff ? ['sheriff'] : [],
    }

    try {
      const res = await api.post<{ roomCode: string }>('/rooms', payload)
      router.push(`/room/${res.data.roomCode}`)
    } catch {
      setError('Failed to create room. Are you logged in?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Create a Room</h1>

        <form onSubmit={handleSubmit} className="space-y-5 bg-gray-900 rounded-xl p-6 border border-gray-800">
          {/* On-site mode */}
          <Toggle
            label="On-site mode"
            description="Moderator announces eliminations verbally"
            checked={form.onSiteMode}
            onChange={(v) => setForm((f) => ({ ...f, onSiteMode: v }))}
          />

          {/* Doctor can save self */}
          <Toggle
            label="Doctor can save themselves"
            checked={form.doctorCanSaveSelf}
            onChange={(v) => setForm((f) => ({ ...f, doctorCanSaveSelf: v }))}
          />

          {/* Tie vote rule */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tie vote rule</label>
            <select
              value={form.tieVoteRule}
              onChange={(e) =>
                setForm((f) => ({ ...f, tieVoteRule: e.target.value as CreateRoomForm['tieVoteRule'] }))
              }
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="no_elimination">No elimination on tie</option>
              <option value="random">Random elimination on tie</option>
              <option value="revote">Revote on tie</option>
            </select>
          </div>

          {/* Durations */}
          <DurationInput
            label="Night duration (seconds)"
            value={form.nightDurationSeconds}
            onChange={(v) => setForm((f) => ({ ...f, nightDurationSeconds: v }))}
          />
          <DurationInput
            label="Discussion duration (seconds)"
            value={form.dayDiscussionDurationSeconds}
            onChange={(v) => setForm((f) => ({ ...f, dayDiscussionDurationSeconds: v }))}
          />
          <DurationInput
            label="Voting duration (seconds)"
            value={form.dayVotingDurationSeconds}
            onChange={(v) => setForm((f) => ({ ...f, dayVotingDurationSeconds: v }))}
          />

          {/* Sheriff role */}
          <div className="border-t border-gray-800 pt-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Special Roles</p>
            <Toggle
              label="Enable Sheriff role"
              description="Village investigator — reveals exact role, but on odd nights only"
              checked={form.enableSheriff}
              onChange={(v) => setForm((f) => ({ ...f, enableSheriff: v }))}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </form>
      </div>
    </main>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-700'}`}
        />
        <div
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

function DurationInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input
        type="number"
        min={10}
        max={600}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}
