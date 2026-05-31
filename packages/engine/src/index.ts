export { ROLE_REGISTRY } from './roles/index.js'
export { gameMachine } from './machine.js'
export { validateNightAction } from './validate.js'
export type { ValidationResult } from './validate.js'
export { filterStateForPlayer } from './filter.js'
export {
  processNightAction,
  resolveNightPhase,
  resolveDayVote,
  checkWinCondition,
  assignRoles,
} from './engine.js'
export type { SideEffect, GameStateTransition, NightAction } from './engine.js'
export type { EngineGameState, EngineRoleDefinition, PendingAction, NightActionOutcome } from './engine-types.js'
export { ROOM_TEMPLATES, expandTemplateRoles } from './templates.js'
export type { RoomTemplate } from './templates.js'
