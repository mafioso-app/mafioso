import { GamePhase, Team } from '@mafioso/types'
import type { EngineGameState } from '../engine-types'
import { detectiveRole } from './detective'

function makeState(overrides: Partial<EngineGameState> = {}): EngineGameState {
  return {
    sessionId: 's1',
    roomId: 'r1',
    phase: GamePhase.NIGHT,
    players: [
      { id: 'det1', userId: 'u1', username: 'alice', seat: 0, isAlive: true, role: 'detective' },
      { id: 'maf1', userId: 'u2', username: 'bob', seat: 1, isAlive: true, role: 'mafia' },
      { id: 'vil1', userId: 'u3', username: 'carl', seat: 2, isAlive: true, role: 'villager' },
      { id: 'doc1', userId: 'u4', username: 'dave', seat: 3, isAlive: true, role: 'doctor' },
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

describe('detectiveRole — static properties', () => {
  it('id is detective', () => expect(detectiveRole.id).toBe('detective'))
  it('team is VILLAGE', () => expect(detectiveRole.team).toBe(Team.VILLAGE))
  it('hasNightAction is true', () => expect(detectiveRole.hasNightAction).toBe(true))
  it('canTargetSelf is false', () => expect(detectiveRole.canTargetSelf).toBe(false))
  it('nightAction is defined', () => expect(detectiveRole.nightAction).toBeDefined())
})

describe('detectiveRole — nightAction', () => {
  it('returns "mafia" when target is mafia', () => {
    const { privateResult } = detectiveRole.nightAction!(makeState(), {
      actorId: 'det1',
      targetId: 'maf1',
      actionType: 'investigate',
    })
    expect(privateResult).toBe('mafia')
  })

  it('returns "not mafia" when target is a villager', () => {
    const { privateResult } = detectiveRole.nightAction!(makeState(), {
      actorId: 'det1',
      targetId: 'vil1',
      actionType: 'investigate',
    })
    expect(privateResult).toBe('not mafia')
  })

  it('returns "not mafia" for any non-mafia role (doctor)', () => {
    const { privateResult } = detectiveRole.nightAction!(makeState(), {
      actorId: 'det1',
      targetId: 'doc1',
      actionType: 'investigate',
    })
    expect(privateResult).toBe('not mafia')
  })

  it('stores result in detectiveResults keyed by actorId', () => {
    const { updatedState } = detectiveRole.nightAction!(makeState(), {
      actorId: 'det1',
      targetId: 'maf1',
      actionType: 'investigate',
    })
    expect(updatedState.detectiveResults['det1']).toBe('mafia')
  })

  it('preserves existing detectiveResults from other detectives', () => {
    const state = makeState({ detectiveResults: { other_det: 'not mafia' } })
    const { updatedState } = detectiveRole.nightAction!(state, {
      actorId: 'det1',
      targetId: 'maf1',
      actionType: 'investigate',
    })
    expect(updatedState.detectiveResults['other_det']).toBe('not mafia')
    expect(updatedState.detectiveResults['det1']).toBe('mafia')
  })

  it('does not add any pendingActions', () => {
    const { updatedState } = detectiveRole.nightAction!(makeState(), {
      actorId: 'det1',
      targetId: 'maf1',
      actionType: 'investigate',
    })
    expect(updatedState.pendingActions).toHaveLength(0)
  })
})
