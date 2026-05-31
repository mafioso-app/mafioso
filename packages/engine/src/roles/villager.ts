import { Team } from '@mafioso/types'
import type { EngineRoleDefinition } from '../engine-types.js'

export const villagerRole: EngineRoleDefinition = {
  id: 'villager',
  team: Team.VILLAGE,
  hasNightAction: false,
  allowedPhases: [],
  canTargetSelf: false,
  displayName: 'Villager',
  description: 'Find and eliminate the mafia by day.',
}
