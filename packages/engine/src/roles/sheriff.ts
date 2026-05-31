import { Team, GamePhase } from '@mafioso/types'
import type { EngineRoleDefinition, EngineGameState, NightAction, NightActionOutcome } from '../engine-types.js'

export const sheriffRole: EngineRoleDefinition = {
  id: 'sheriff',
  team: Team.VILLAGE,
  hasNightAction: true,
  allowedPhases: [GamePhase.NIGHT],
  canTargetSelf: false,
  displayName: 'Sheriff',
  description: "Investigate a player on odd nights to learn their exact role.",

  // Only active on odd nights (1, 3, 5…)
  canAct(state: EngineGameState, _actorId: string): boolean {
    return state.nightNumber % 2 === 1
  },

  nightAction(state: EngineGameState, action: NightAction): NightActionOutcome {
    const target = state.players.find((p) => p.id === action.targetId)
    // Reveal exact role name (or 'unknown' if role is unset — should not happen during NIGHT)
    const exactRole: string = target?.role ?? 'unknown'

    return {
      updatedState: {
        ...state,
        detectiveResults: { ...state.detectiveResults, [action.actorId]: exactRole },
      },
      privateResult: exactRole,
    }
  },
}
