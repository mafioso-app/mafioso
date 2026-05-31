import { Team, GamePhase } from '@mafioso/types'
import type { EngineRoleDefinition, EngineGameState, NightAction, NightActionOutcome } from '../engine-types.js'

export const mafiaRole: EngineRoleDefinition = {
  id: 'mafia',
  team: Team.MAFIA,
  hasNightAction: true,
  allowedPhases: [GamePhase.NIGHT],
  canTargetSelf: false,
  displayName: 'Mafia',
  description: 'Eliminate a villager each night.',

  nightAction(state: EngineGameState, action: NightAction): NightActionOutcome {
    // All mafia share one kill slot; the last submission overwrites any previous KILL
    const pendingActions = [
      ...state.pendingActions.filter((a) => a.type !== 'KILL'),
      { type: 'KILL' as const, actorId: action.actorId, targetId: action.targetId },
    ]
    return { updatedState: { ...state, pendingActions } }
  },
}
