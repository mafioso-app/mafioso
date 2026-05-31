import { GamePhase, Team } from '@mafioso/types'
import type { EngineGameState } from './engine-types'
import { filterStateForPlayer } from './filter'

function p(id: string, role: string, isAlive = true): EngineGameState['players'][0] {
  return { id, userId: `u_${id}`, username: id, seat: 0, isAlive, role }
}

function makeState(overrides: Partial<EngineGameState> = {}): EngineGameState {
  return {
    sessionId: 's1',
    roomId: 'r1',
    phase: GamePhase.DAY_DISCUSSION,
    players: [
      p('maf1', 'mafia'),
      p('maf2', 'mafia'),
      p('vil1', 'villager'),
      p('det1', 'detective'),
    ],
    nightActionsTaken: {},
    votes: { vil1: 'maf1' },
    timerEndsAt: 9999,
    winner: null,
    pendingActions: [],
    detectiveResults: {},
    nightNumber: 1,
    ...overrides,
  }
}

describe('filterStateForPlayer', () => {
  it('player sees their own role', () => {
    const view = filterStateForPlayer(makeState(), 'vil1')
    expect(view.players.find((p) => p.id === 'vil1')!.role).toBe('villager')
  })

  it('villager does NOT see other players roles', () => {
    const view = filterStateForPlayer(makeState(), 'vil1')
    expect(view.players.find((p) => p.id === 'maf1')!.role).toBeNull()
    expect(view.players.find((p) => p.id === 'det1')!.role).toBeNull()
  })

  it('mafia player sees all mafia teammates', () => {
    const view = filterStateForPlayer(makeState(), 'maf1')
    expect(view.players.find((p) => p.id === 'maf1')!.role).toBe('mafia')
    expect(view.players.find((p) => p.id === 'maf2')!.role).toBe('mafia')
  })

  it('mafia player does NOT see non-mafia roles', () => {
    const view = filterStateForPlayer(makeState(), 'maf1')
    expect(view.players.find((p) => p.id === 'vil1')!.role).toBeNull()
    expect(view.players.find((p) => p.id === 'det1')!.role).toBeNull()
  })

  it('detective sees only their own role (not mafia)', () => {
    const view = filterStateForPlayer(makeState(), 'det1')
    expect(view.players.find((p) => p.id === 'det1')!.role).toBe('detective')
    expect(view.players.find((p) => p.id === 'maf1')!.role).toBeNull()
  })

  it('preserves all players including dead ones', () => {
    const state = makeState({
      players: [p('maf1', 'mafia'), p('vil1', 'villager', false)],
    })
    const view = filterStateForPlayer(state, 'maf1')
    expect(view.players).toHaveLength(2)
    expect(view.players.find((p) => p.id === 'vil1')!.isAlive).toBe(false)
  })

  it('preserves votes, phase, timerEndsAt, winner, roomId, sessionId', () => {
    const view = filterStateForPlayer(makeState(), 'vil1')
    expect(view.votes).toEqual({ vil1: 'maf1' })
    expect(view.phase).toBe(GamePhase.DAY_DISCUSSION)
    expect(view.timerEndsAt).toBe(9999)
    expect(view.winner).toBeNull()
    expect(view.roomId).toBe('r1')
    expect(view.sessionId).toBe('s1')
  })

  it('does NOT expose nightActionsTaken', () => {
    const view = filterStateForPlayer(makeState(), 'vil1') as unknown as Record<string, unknown>
    expect(view['nightActionsTaken']).toBeUndefined()
  })
})
