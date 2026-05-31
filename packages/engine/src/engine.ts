import { GameState, Team, GamePhase, RoomSettings } from '@mafioso/types'
import { validateNightAction } from './validate.js'
import { ROLE_REGISTRY } from './roles/index.js'
import type { EngineGameState, NightAction } from './engine-types.js'

export type { NightAction } from './engine-types.js'

export interface SideEffect {
  type: string
  payload: Record<string, unknown>
}

export interface GameStateTransition {
  nextState: EngineGameState
  sideEffects: SideEffect[]
  privateResult?: string
}

// ---------------------------------------------------------------------------
// Win condition
// ---------------------------------------------------------------------------

export function checkWinCondition(state: EngineGameState): Team | null {
  const alive = state.players.filter((p) => p.isAlive)
  const mafiaAlive = alive.filter((p) => ROLE_REGISTRY.get(p.role ?? '')?.team === Team.MAFIA).length
  const villageAlive = alive.filter((p) => ROLE_REGISTRY.get(p.role ?? '')?.team === Team.VILLAGE).length

  if (mafiaAlive === 0) return Team.VILLAGE
  if (mafiaAlive >= villageAlive) return Team.MAFIA
  return null
}

// ---------------------------------------------------------------------------
// Assign roles (Fisher-Yates shuffle)
// ---------------------------------------------------------------------------

export function assignRoles(state: EngineGameState, roleIds: string[]): EngineGameState {
  if (roleIds.length !== state.players.length) {
    throw new Error(
      `Role count (${roleIds.length}) must match player count (${state.players.length})`,
    )
  }

  const shuffled = [...roleIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = shuffled[i]!
    shuffled[i] = shuffled[j]!
    shuffled[j] = tmp
  }

  const players = state.players.map((p, i) => ({ ...p, role: shuffled[i]! }))
  return { ...state, players }
}

// ---------------------------------------------------------------------------
// Resolve night phase
// ---------------------------------------------------------------------------

export function resolveNightPhase(state: EngineGameState): GameStateTransition {
  const killAction = state.pendingActions.find((a) => a.type === 'KILL')
  const saveTargets = new Set(
    state.pendingActions.filter((a) => a.type === 'SAVE').map((a) => a.targetId),
  )

  let players = state.players
  const sideEffects: SideEffect[] = []

  if (killAction) {
    if (saveTargets.has(killAction.targetId)) {
      sideEffects.push({ type: 'PLAYER_SAVED', payload: { targetId: killAction.targetId } })
    } else {
      players = players.map((p) =>
        p.id === killAction.targetId ? { ...p, isAlive: false } : p,
      )
      sideEffects.push({
        type: 'PLAYER_ELIMINATED',
        payload: {
          targetId: killAction.targetId,
          actorId: killAction.actorId,
          reason: 'MAFIA_KILL',
        },
      })
    }
  }

  const resolved: EngineGameState = {
    ...state,
    players,
    pendingActions: [],
    nightActionsTaken: {},
    votes: {},
    nightNumber: state.nightNumber + 1,
  }

  const winner = checkWinCondition(resolved)
  const nextState: EngineGameState = {
    ...resolved,
    phase: winner ? GamePhase.GAME_OVER : GamePhase.DAY_DISCUSSION,
    winner,
  }

  if (winner) {
    sideEffects.push({ type: 'GAME_OVER', payload: { winner } })
  }

  return { nextState, sideEffects }
}

// ---------------------------------------------------------------------------
// Resolve day vote
// ---------------------------------------------------------------------------

export function resolveDayVote(
  state: EngineGameState,
  settings: Pick<RoomSettings, 'tieVoteRule'>,
): GameStateTransition {
  const voteCounts = new Map<string, number>()
  for (const targetId of Object.values(state.votes)) {
    voteCounts.set(targetId, (voteCounts.get(targetId) ?? 0) + 1)
  }

  const sideEffects: SideEffect[] = []

  if (voteCounts.size === 0) {
    const noVoteState: EngineGameState = {
      ...state,
      votes: {},
      phase: GamePhase.NIGHT,
    }
    return { nextState: noVoteState, sideEffects }
  }

  const maxVotes = Math.max(...voteCounts.values())
  const topCandidates = [...voteCounts.entries()]
    .filter(([, count]) => count === maxVotes)
    .map(([id]) => id)

  const isTie = topCandidates.length > 1

  if (isTie && settings.tieVoteRule === 'revote') {
    sideEffects.push({
      type: 'REVOTE_NEEDED',
      payload: { candidates: topCandidates },
    })
    return { nextState: { ...state, votes: {} }, sideEffects }
  }

  let eliminatedId: string | null = null
  if (!isTie) {
    eliminatedId = topCandidates[0]!
  } else if (settings.tieVoteRule === 'random') {
    eliminatedId = topCandidates[Math.floor(Math.random() * topCandidates.length)]!
  }
  // tieVoteRule === 'no_elimination' → eliminatedId stays null

  let players = state.players
  if (eliminatedId) {
    players = players.map((p) => (p.id === eliminatedId ? { ...p, isAlive: false } : p))
    sideEffects.push({
      type: 'PLAYER_ELIMINATED',
      payload: { targetId: eliminatedId, reason: 'VOTED_OUT' },
    })
  }

  const resolved: EngineGameState = {
    ...state,
    players,
    votes: {},
    nightActionsTaken: {},
    pendingActions: [],
  }

  const winner = checkWinCondition(resolved)
  const nextState: EngineGameState = {
    ...resolved,
    phase: winner ? GamePhase.GAME_OVER : GamePhase.NIGHT,
    winner,
  }

  if (winner) {
    sideEffects.push({ type: 'GAME_OVER', payload: { winner } })
  }

  return { nextState, sideEffects }
}

// ---------------------------------------------------------------------------
// Process a single night action (validate → role handler → mark acted)
// ---------------------------------------------------------------------------

export function processNightAction(
  state: GameState,
  action: NightAction,
): GameStateTransition {
  const validation = validateNightAction(state, action)
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Invalid action')
  }

  const engineState: EngineGameState = {
    ...state,
    pendingActions: (state as EngineGameState).pendingActions ?? [],
    detectiveResults: (state as EngineGameState).detectiveResults ?? {},
    nightNumber: (state as EngineGameState).nightNumber ?? 1,
  }

  const actor = state.players.find((p) => p.id === action.actorId)!
  const roleDef = ROLE_REGISTRY.get(actor.role!)

  let updatedState = engineState
  let privateResult: string | undefined

  if (roleDef?.nightAction) {
    const outcome = roleDef.nightAction(engineState, action)
    updatedState = outcome.updatedState
    privateResult = outcome.privateResult
  }

  const nextState: EngineGameState = {
    ...updatedState,
    nightActionsTaken: { ...updatedState.nightActionsTaken, [action.actorId]: true },
  }

  return {
    nextState,
    sideEffects: [],
    ...(privateResult !== undefined ? { privateResult } : {}),
  }
}
