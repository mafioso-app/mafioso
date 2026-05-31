import { GamePhase, Team } from '@mafioso/types'
import type { EngineGameState } from '../engine-types'
import { mafiaRole } from './mafia'

function makeState(overrides: Partial<EngineGameState> = {}): EngineGameState {
  return {
    sessionId: 's1',
    roomId: 'r1',
    phase: GamePhase.NIGHT,
    players: [
      { id: 'maf1', userId: 'u1', username: 'alice', seat: 0, isAlive: true, role: 'mafia' },
      { id: 'maf2', userId: 'u2', username: 'bob', seat: 1, isAlive: true, role: 'mafia' },
      { id: 'vil1', userId: 'u3', username: 'carl', seat: 2, isAlive: true, role: 'villager' },
    ],
    nightActionsTaken: {},
    votes: {},
    timerEndsAt: null,
    winner: null,
    pendingActions: [],
    detectiveResults: {},
    nightNumber: 1,
    ...overrides,
  }
}

describe('mafiaRole — static properties', () => {
  it('id is mafia', () => expect(mafiaRole.id).toBe('mafia'))
  it('team is MAFIA', () => expect(mafiaRole.team).toBe(Team.MAFIA))
  it('hasNightAction is true', () => expect(mafiaRole.hasNightAction).toBe(true))
  it('canTargetSelf is false', () => expect(mafiaRole.canTargetSelf).toBe(false))
  it('nightAction is defined', () => expect(mafiaRole.nightAction).toBeDefined())
})

describe('mafiaRole — nightAction', () => {
  const action = { actorId: 'maf1', targetId: 'vil1', actionType: 'kill' }

  it('adds a KILL pending action', () => {
    const { updatedState } = mafiaRole.nightAction!(makeState(), action)
    expect(updatedState.pendingActions).toHaveLength(1)
    expect(updatedState.pendingActions[0]).toEqual({
      type: 'KILL',
      actorId: 'maf1',
      targetId: 'vil1',
    })
  })

  it('overwrites a previous KILL — last submission wins', () => {
    const state = makeState({
      pendingActions: [{ type: 'KILL', actorId: 'maf1', targetId: 'vil1' }],
    })
    const { updatedState } = mafiaRole.nightAction!(state, {
      actorId: 'maf2',
      targetId: 'vil1',
      actionType: 'kill',
    })
    expect(updatedState.pendingActions).toHaveLength(1)
    expect(updatedState.pendingActions[0]!.actorId).toBe('maf2')
  })

  it('preserves non-KILL pending actions', () => {
    const state = makeState({
      pendingActions: [{ type: 'SAVE', actorId: 'doc1', targetId: 'vil1' }],
    })
    const { updatedState } = mafiaRole.nightAction!(state, action)
    expect(updatedState.pendingActions).toHaveLength(2)
    expect(updatedState.pendingActions.some((a) => a.type === 'SAVE')).toBe(true)
  })

  it('does not modify detectiveResults', () => {
    const state = makeState({ detectiveResults: { det1: 'mafia' } })
    const { updatedState } = mafiaRole.nightAction!(state, action)
    expect(updatedState.detectiveResults).toEqual({ det1: 'mafia' })
  })

  it('returns no privateResult', () => {
    const { privateResult } = mafiaRole.nightAction!(makeState(), action)
    expect(privateResult).toBeUndefined()
  })
})
