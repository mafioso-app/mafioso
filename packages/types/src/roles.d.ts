import { Team, GamePhase } from './room.js';
export type RoleId = 'mafia' | 'villager' | 'detective' | 'doctor' | (string & {});
export interface NightActionResult {
    type: string;
    payload: Record<string, unknown>;
}
export interface RoleDefinition {
    id: RoleId;
    team: Team;
    hasNightAction: boolean;
    allowedPhases: GamePhase[];
    canTargetSelf: boolean;
    displayName: string;
    description: string;
}
//# sourceMappingURL=roles.d.ts.map