import { GamePhase, Team } from './room.js';
import { RoleId } from './roles.js';
export interface PlayerState {
    id: string;
    userId: string;
    username: string;
    seat: number;
    isAlive: boolean;
    role: RoleId | null;
}
export interface ClientPlayerState extends Omit<PlayerState, 'role'> {
    role: RoleId | null;
}
export interface GameState {
    sessionId: string;
    roomId: string;
    phase: GamePhase;
    players: PlayerState[];
    nightActionsTaken: Record<string, boolean>;
    votes: Record<string, string>;
    timerEndsAt: number | null;
    winner: Team | null;
}
export interface ClientGameState {
    sessionId: string;
    roomId: string;
    phase: GamePhase;
    players: ClientPlayerState[];
    votes: Record<string, string>;
    timerEndsAt: number | null;
    winner: Team | null;
}
//# sourceMappingURL=game-state.d.ts.map