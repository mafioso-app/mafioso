import { GameState, GamePhase } from '@mafioso/types'
import { ROLE_REGISTRY } from './roles/index.js'
import type { NightAction, EngineGameState } from './engine-types.js'

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateNightAction(state: GameState, action: NightAction): ValidationResult {
  if (state.phase !== GamePhase.NIGHT) {
    return { valid: false, error: 'Not in night phase' }
  }

  const actor = state.players.find((p) => p.id === action.actorId)
  if (!actor) return { valid: false, error: 'Actor not found' }
  if (!actor.isAlive) return { valid: false, error: 'Actor is not alive' }

  const target = state.players.find((p) => p.id === action.targetId)
  if (!target) return { valid: false, error: 'Target not found' }
  if (!target.isAlive) return { valid: false, error: 'Target is not alive' }

  if (!actor.role) return { valid: false, error: 'Actor has no role' }
  const roleDef = ROLE_REGISTRY.get(actor.role)
  if (!roleDef) return { valid: false, error: 'Unknown role' }
  if (!roleDef.hasNightAction) return { valid: false, error: 'Role has no night action' }
  if (!roleDef.canTargetSelf && action.actorId === action.targetId) {
    return { valid: false, error: 'Cannot target self' }
  }

  if (state.nightActionsTaken[action.actorId]) {
    return { valid: false, error: 'Already acted this phase' }
  }

  if (roleDef.canAct && !(roleDef.canAct(state as EngineGameState, action.actorId))) {
    return { valid: false, error: 'Cannot act this night (cooldown)' }
  }

  return { valid: true }
}
