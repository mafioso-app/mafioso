import { Team, GamePhase } from '@mafioso/types'
import type { EngineRoleDefinition, EngineGameState, NightAction, NightActionOutcome } from '../engine-types.js'

export const doctorRole: EngineRoleDefinition = {
  id: 'doctor',
  team: Team.VILLAGE,
  hasNightAction: true,
  allowedPhases: [GamePhase.NIGHT],
  canTargetSelf: true,
  displayName: 'Doctor',
  description: 'Save one player each night from elimination.',

  nightAction(state: EngineGameState, action: NightAction): NightActionOutcome {
    const pendingActions = [
      ...state.pendingActions,
      { type: 'SAVE' as const, actorId: action.actorId, targetId: action.targetId },
    ]
    return { updatedState: { ...state, pendingActions } }
  },
}
