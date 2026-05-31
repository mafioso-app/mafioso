export declare enum RoomStatus {
    LOBBY = "LOBBY",
    ACTIVE = "ACTIVE",
    FINISHED = "FINISHED"
}
export declare enum GamePhase {
    LOBBY = "LOBBY",
    NIGHT = "NIGHT",
    DAY_DISCUSSION = "DAY_DISCUSSION",
    DAY_VOTING = "DAY_VOTING",
    GAME_OVER = "GAME_OVER"
}
export declare enum Team {
    VILLAGE = "VILLAGE",
    MAFIA = "MAFIA"
}
export interface RoomSettings {
    onSiteMode: boolean;
    doctorCanSaveSelf: boolean;
    tieVoteRule: 'no_elimination' | 'random' | 'revote';
    nightDurationSeconds: number;
    dayDiscussionDurationSeconds: number;
    dayVotingDurationSeconds: number;
    maxPlayers?: number;
    requireInvite?: boolean;
}
//# sourceMappingURL=room.d.ts.map