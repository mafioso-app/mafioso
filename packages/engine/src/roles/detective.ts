import { Team, GamePhase } from '@mafioso/types'
import type { EngineRoleDefinition, EngineGameState, NightAction, NightActionOutcome } from '../engine-types.js'

export const detectiveRole: EngineRoleDefinition = {
  id: 'detective',
  team: Team.VILLAGE,
  hasNightAction: true,
  allowedPhases: [GamePhase.NIGHT],
  canTargetSelf: false,
  displayName: 'Detective',
  description: "Investigate a player each night to learn if they're mafia.",

  nightAction(state: EngineGameState, action: NightAction): NightActionOutcome {
    const target = state.players.find((p) => p.id === action.targetId)
    const result = target?.role === 'mafia' ? 'mafia' : 'not mafia'
    return {
      updatedState: {
        ...state,
        detectiveResults: { ...state.detectiveResults, [action.actorId]: result },
      },
      privateResult: result,
    }
  },
}
