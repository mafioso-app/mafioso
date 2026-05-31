import type { GameState, RoleDefinition } from '@mafioso/types'

export interface NightAction {
  actorId: string
  targetId: string
  actionType: string
}

export interface PendingAction {
  type: 'KILL' | 'SAVE'
  actorId: string
  targetId: string
}

export interface EngineGameState extends GameState {
  pendingActions: PendingAction[]
  detectiveResults: Record<string, string>
  nightNumber: number
}

export interface NightActionOutcome {
  updatedState: EngineGameState
  privateResult?: string
}

export interface EngineRoleDefinition extends RoleDefinition {
  canAct?: (state: EngineGameState, actorId: string) => boolean
  nightAction?: (state: EngineGameState, action: NightAction) => NightActionOutcome
}
