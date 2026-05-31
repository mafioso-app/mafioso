import type { EngineRoleDefinition } from '../engine-types.js'
import { mafiaRole } from './mafia.js'
import { villagerRole } from './villager.js'
import { detectiveRole } from './detective.js'
import { doctorRole } from './doctor.js'
import { sheriffRole } from './sheriff.js'

export const ROLE_REGISTRY: Map<string, EngineRoleDefinition> = new Map([
  [mafiaRole.id, mafiaRole],
  [villagerRole.id, villagerRole],
  [detectiveRole.id, detectiveRole],
  [doctorRole.id, doctorRole],
  [sheriffRole.id, sheriffRole],
])

export { mafiaRole, villagerRole, detectiveRole, doctorRole, sheriffRole }
