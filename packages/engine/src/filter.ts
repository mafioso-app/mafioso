import { GameState, ClientGameState, ClientPlayerState, Team } from '@mafioso/types'
import { ROLE_REGISTRY } from './roles/index.js'

export function filterStateForPlayer(state: GameState, playerId: string): ClientGameState {
  const viewer = state.players.find((p) => p.id === playerId)
  const viewerRole = viewer?.role ?? null
  const viewerTeam = viewerRole ? (ROLE_REGISTRY.get(viewerRole)?.team ?? null) : null
  const isSpectator = viewer ? !viewer.isAlive : false

  const players: ClientPlayerState[] = state.players.map((p) => {
    // Spectators see alive player names only, no roles
    const showRole =
      !isSpectator &&
      (p.id === playerId || (viewerTeam === Team.MAFIA && p.role === 'mafia'))
    return {
      id: p.id,
      userId: p.userId,
      username: p.username,
      seat: p.seat,
      isAlive: p.isAlive,
      role: showRole ? p.role : null,
    }
  })

  return {
    sessionId: state.sessionId,
    roomId: state.roomId,
    phase: state.phase,
    players,
    votes: state.votes,
    timerEndsAt: state.timerEndsAt,
    winner: state.winner,
    isSpectator,
  }
}
