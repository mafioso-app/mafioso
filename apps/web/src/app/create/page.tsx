'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Check, Users } from 'lucide-react'
import { api } from '@/lib/api'

interface RoomTemplate {
  id: string
  name: string
  minPlayers: number
  maxPlayers: number
  description: string
  roles: Record<string, number>
}

interface StepOneForm {
  onSiteMode: boolean
  nightDurationSeconds: number
  dayDiscussionDurationSeconds: number
  dayVotingDurationSeconds: number
}

interface CustomRoles {
  mafia: number
  detective: number
  doctor: number
  sheriff: number
  villager: number
}

const ROLE_COLORS: Record<string, string> = {
  mafia: 'bg-red-900 text-red-200',
  detective: 'bg-blue-900 text-blue-200',
  doctor: 'bg-pink-900 text-pink-200',
  sheriff: 'bg-yellow-900 text-yellow-200',
  villager: 'bg-green-900 text-green-200',
}

export default function CreateRoomPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [templates, setTemplates] = useState<RoomTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('classic_7')
  const [customRoles, setCustomRoles] = useState<CustomRoles>({
    mafia: 2, detective: 1, doctor: 1, sheriff: 0, villager: 3,
  })
  const [stepOne, setStepOne] = useState<StepOneForm>({
    onSiteMode: false,
    nightDurationSeconds: 60,
    dayDiscussionDurationSeconds: 120,
    dayVotingDurationSeconds: 60,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<RoomTemplate[]>('/rooms/templates').then((r) => setTemplates(r.data)).catch(() => {})
  }, [])

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
  const isCustom = selectedTemplateId === 'custom'

  const totalCustomRoles = Object.values(customRoles).reduce((a, b) => a + b, 0)
  const targetPlayers = isCustom ? totalCustomRoles : selectedTemplate?.maxPlayers ?? 0
  const roleCountMismatch =
    isCustom && totalCustomRoles < 4

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        ...stepOne,
        templateId: selectedTemplateId,
      }

      if (isCustom) {
        const enabledRoles: string[] = []
        for (const [role, count] of Object.entries(customRoles)) {
          for (let i = 0; i < count; i++) enabledRoles.push(role)
        }
        payload['enabledRoles'] = enabledRoles
        payload['maxPlayers'] = totalCustomRoles
        delete payload['templateId']
      }

      const res = await api.post<{ roomCode: string }>('/rooms', payload)
      router.push(`/room/${res.data.roomCode}`)
    } catch {
      setError('Failed to create room. Are you logged in?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  step > s
                    ? 'bg-green-600 text-white'
                    : step === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className="flex-1 h-0.5 w-8 bg-gray-700" />}
            </div>
          ))}
          <span className="ml-3 text-sm text-gray-400">
            {step === 1 ? 'Settings' : step === 2 ? 'Template' : 'Review'}
          </span>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Room Settings</h2>

              <Toggle
                label="On-site mode"
                description="Moderator announces eliminations verbally"
                checked={stepOne.onSiteMode}
                onChange={(v) => setStepOne((f) => ({ ...f, onSiteMode: v }))}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <NumberInput
                  label="Night (s)"
                  value={stepOne.nightDurationSeconds}
                  onChange={(v) => setStepOne((f) => ({ ...f, nightDurationSeconds: v }))}
                />
                <NumberInput
                  label="Discussion (s)"
                  value={stepOne.dayDiscussionDurationSeconds}
                  onChange={(v) => setStepOne((f) => ({ ...f, dayDiscussionDurationSeconds: v }))}
                />
                <NumberInput
                  label="Voting (s)"
                  value={stepOne.dayVotingDurationSeconds}
                  onChange={(v) => setStepOne((f) => ({ ...f, dayVotingDurationSeconds: v }))}
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Choose Template</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`text-left p-4 rounded-xl border transition-colors ${
                      selectedTemplateId === t.id
                        ? 'border-blue-500 bg-blue-950/40'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-100">{t.name}</span>
                      {t.id !== 'custom' && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Users className="w-3.5 h-3.5" />
                          {t.maxPlayers}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{t.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(t.roles).map(([role, count]) => (
                        <span
                          key={role}
                          className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[role] ?? 'bg-gray-700 text-gray-300'}`}
                        >
                          {count}× {role}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom role inputs */}
              {isCustom && (
                <div className="border-t border-gray-700 pt-4 space-y-3">
                  <p className="text-sm font-medium text-gray-300">Custom role counts</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(Object.keys(customRoles) as Array<keyof CustomRoles>).map((role) => (
                      <div key={role}>
                        <label className="block text-xs text-gray-400 mb-1 capitalize">{role}</label>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          value={customRoles[role]}
                          onChange={(e) =>
                            setCustomRoles((r) => ({ ...r, [role]: Math.max(0, Number(e.target.value)) }))
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                  {roleCountMismatch && (
                    <p className="text-xs text-red-400">
                      Total players must be at least 4 (currently {totalCustomRoles})
                    </p>
                  )}
                  {!roleCountMismatch && (
                    <p className="text-xs text-gray-500">Total: {totalCustomRoles} players</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Review & Create</h2>

              <div className="space-y-3 text-sm">
                <ReviewRow label="Template" value={selectedTemplate?.name ?? 'Custom'} />
                <ReviewRow
                  label="Players"
                  value={isCustom ? `${totalCustomRoles} custom` : `${targetPlayers}`}
                />
                <ReviewRow
                  label="On-site mode"
                  value={stepOne.onSiteMode ? 'Enabled' : 'Disabled'}
                />
                <ReviewRow label="Night duration" value={`${stepOne.nightDurationSeconds}s`} />
                <ReviewRow
                  label="Discussion"
                  value={`${stepOne.dayDiscussionDurationSeconds}s`}
                />
                <ReviewRow label="Voting" value={`${stepOne.dayVotingDurationSeconds}s`} />
              </div>

              {/* Role breakdown */}
              <div className="flex flex-wrap gap-1.5">
                {isCustom
                  ? Object.entries(customRoles).flatMap(([role, count]) =>
                      count > 0 ? (
                        <span
                          key={role}
                          className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[role] ?? 'bg-gray-700 text-gray-300'}`}
                        >
                          {count}× {role}
                        </span>
                      ) : []
                    )
                  : Object.entries(selectedTemplate?.roles ?? {}).map(([role, count]) => (
                      <span
                        key={role}
                        className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[role] ?? 'bg-gray-700 text-gray-300'}`}
                      >
                        {count}× {role}
                      </span>
                    ))}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                disabled={step === 2 && roleCountMismatch}
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleCreate}
                className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            )}
          </div>
        </div>
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
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-700'}`} />
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-200">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        min={10}
        max={600}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-800 pb-2">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-200 font-medium">{value}</span>
    </div>
  )
}
