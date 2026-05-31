import { GamePhase, Team } from '@mafioso/types'
import type { EngineGameState } from '../engine-types'
import { doctorRole } from './doctor'

function makeState(overrides: Partial<EngineGameState> = {}): EngineGameState {
  return {
    sessionId: 's1',
    roomId: 'r1',
    phase: GamePhase.NIGHT,
    players: [
      { id: 'doc1', userId: 'u1', username: 'alice', seat: 0, isAlive: true, role: 'doctor' },
      { id: 'vil1', userId: 'u2', username: 'bob', seat: 1, isAlive: true, role: 'villager' },
      { id: 'maf1', userId: 'u3', username: 'carl', seat: 2, isAlive: true, role: 'mafia' },
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

describe('doctorRole — static properties', () => {
  it('id is doctor', () => expect(doctorRole.id).toBe('doctor'))
  it('team is VILLAGE', () => expect(doctorRole.team).toBe(Team.VILLAGE))
  it('hasNightAction is true', () => expect(doctorRole.hasNightAction).toBe(true))
  it('canTargetSelf is true', () => expect(doctorRole.canTargetSelf).toBe(true))
  it('nightAction is defined', () => expect(doctorRole.nightAction).toBeDefined())
})

describe('doctorRole — nightAction', () => {
  const action = { actorId: 'doc1', targetId: 'vil1', actionType: 'save' }

  it('adds a SAVE pending action', () => {
    const { updatedState } = doctorRole.nightAction!(makeState(), action)
    expect(updatedState.pendingActions).toHaveLength(1)
    expect(updatedState.pendingActions[0]).toEqual({
      type: 'SAVE',
      actorId: 'doc1',
      targetId: 'vil1',
    })
  })

  it('appends to existing pending actions', () => {
    const state = makeState({
      pendingActions: [{ type: 'KILL', actorId: 'maf1', targetId: 'vil1' }],
    })
    const { updatedState } = doctorRole.nightAction!(state, action)
    expect(updatedState.pendingActions).toHaveLength(2)
    expect(updatedState.pendingActions.some((a) => a.type === 'KILL')).toBe(true)
    expect(updatedState.pendingActions.some((a) => a.type === 'SAVE')).toBe(true)
  })

  it('can target self', () => {
    const selfAction = { actorId: 'doc1', targetId: 'doc1', actionType: 'save' }
    const { updatedState } = doctorRole.nightAction!(makeState(), selfAction)
    expect(updatedState.pendingActions[0]).toEqual({
      type: 'SAVE',
      actorId: 'doc1',
      targetId: 'doc1',
    })
  })

  it('does not modify detectiveResults', () => {
    const state = makeState({ detectiveResults: { det1: 'not mafia' } })
    const { updatedState } = doctorRole.nightAction!(state, action)
    expect(updatedState.detectiveResults).toEqual({ det1: 'not mafia' })
  })

  it('returns no privateResult', () => {
    const { privateResult } = doctorRole.nightAction!(makeState(), action)
    expect(privateResult).toBeUndefined()
  })
})
