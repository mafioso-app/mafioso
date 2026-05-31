export interface JoinRoomDto {
    roomCode: string;
    userId: string;
}
export interface NightActionDto {
    sessionId: string;
    actorId: string;
    targetId: string;
}
export interface VoteCastDto {
    sessionId: string;
    voterId: string;
    targetId: string;
}
export interface ReconnectDto {
    sessionId: string;
    userId: string;
}
//# sourceMappingURL=dto.d.ts.map