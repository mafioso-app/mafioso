export enum RoomStatus {
  LOBBY = 'LOBBY',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
}

export enum GamePhase {
  LOBBY = 'LOBBY',
  NIGHT = 'NIGHT',
  DAY_DISCUSSION = 'DAY_DISCUSSION',
  DAY_VOTING = 'DAY_VOTING',
  GAME_OVER = 'GAME_OVER',
}

export enum Team {
  VILLAGE = 'VILLAGE',
  MAFIA = 'MAFIA',
}

export interface RoomSettings {
  onSiteMode: boolean
  doctorCanSaveSelf: boolean
  tieVoteRule: 'no_elimination' | 'random' | 'revote'
  nightDurationSeconds: number
  dayDiscussionDurationSeconds: number
  dayVotingDurationSeconds: number
  maxPlayers?: number
  requireInvite?: boolean
  enabledRoles?: string[]
}
