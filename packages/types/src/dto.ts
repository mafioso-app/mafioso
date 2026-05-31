// Payloads sent from client → server over WebSocket.
// Server reads actor identity from the JWT on client.data, not from these payloads.

export interface JoinRoomDto {
  roomCode: string
}

export interface NightActionDto {
  targetId: string
  actionType: string
}

export interface VoteCastDto {
  targetId: string
}

export interface ReconnectDto {
  roomCode: string
}
