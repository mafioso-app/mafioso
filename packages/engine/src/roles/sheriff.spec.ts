import { GamePhase, Team } from '@mafioso/types'
import type { EngineGameState } from '../engine-types'
import { sheriffRole } from './sheriff'

function makeState(overrides: Partial<EngineGameState> = {}): EngineGameState {
  return {
    sessionId: 's1',
    roomId: 'r1',
    phase: GamePhase.NIGHT,
    players: [
      { id: 'sher1', userId: 'u1', username: 'alice', seat: 0, isAlive: true, role: 'sheriff' },
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

describe('sheriffRole — static properties', () => {
  it('id is sheriff', () => expect(sheriffRole.id).toBe('sheriff'))
  it('team is VILLAGE', () => expect(sheriffRole.team).toBe(Team.VILLAGE))
  it('hasNightAction is true', () => expect(sheriffRole.hasNightAction).toBe(true))
  it('canTargetSelf is false', () => expect(sheriffRole.canTargetSelf).toBe(false))
  it('nightAction is defined', () => expect(sheriffRole.nightAction).toBeDefined())
  it('canAct is defined', () => expect(sheriffRole.canAct).toBeDefined())
})

describe('sheriffRole — odd-night cooldown', () => {
  it('canAct returns true on night 1 (odd)', () => {
    const state = makeState({ nightNumber: 1 })
    expect(sheriffRole.canAct!(state, 'sher1')).toBe(true)
  })

  it('canAct returns false on night 2 (even)', () => {
    const state = makeState({ nightNumber: 2 })
    expect(sheriffRole.canAct!(state, 'sher1')).toBe(false)
  })

  it('canAct returns true on night 3 (odd)', () => {
    const state = makeState({ nightNumber: 3 })
    expect(sheriffRole.canAct!(state, 'sher1')).toBe(true)
  })

  it('canAct returns false on night 4 (even)', () => {
    const state = makeState({ nightNumber: 4 })
    expect(sheriffRole.canAct!(state, 'sher1')).toBe(false)
  })
})

describe('sheriffRole — nightAction (exact role reveal)', () => {
  it('reveals exact role "mafia" for a mafia player', () => {
    const state = makeState()
    const { privateResult } = sheriffRole.nightAction!(state, {
      actorId: 'sher1',
      targetId: 'maf1',
      actionType: 'investigate',
    })
    expect(privateResult).toBe('mafia')
  })

  it('reveals exact role "villager" for a villager', () => {
    const state = makeState()
    const { privateResult } = sheriffRole.nightAction!(state, {
      actorId: 'sher1',
      targetId: 'vil1',
      actionType: 'investigate',
    })
    expect(privateResult).toBe('villager')
  })

  it('reveals exact role "doctor" for a doctor', () => {
    const state = makeState()
    const { privateResult } = sheriffRole.nightAction!(state, {
      actorId: 'sher1',
      targetId: 'doc1',
      actionType: 'investigate',
    })
    expect(privateResult).toBe('doctor')
  })

  it('stores result in detectiveResults keyed by actorId', () => {
    const state = makeState()
    const { updatedState } = sheriffRole.nightAction!(state, {
      actorId: 'sher1',
      targetId: 'maf1',
      actionType: 'investigate',
    })
    expect(updatedState.detectiveResults['sher1']).toBe('mafia')
  })

  it('does not add any pendingActions', () => {
    const state = makeState()
    const { updatedState } = sheriffRole.nightAction!(state, {
      actorId: 'sher1',
      targetId: 'maf1',
      actionType: 'investigate',
    })
    expect(updatedState.pendingActions).toHaveLength(0)
  })

  it('preserves existing detectiveResults from other investigators', () => {
    const state = makeState({ detectiveResults: { det1: 'not mafia' } })
    const { updatedState } = sheriffRole.nightAction!(state, {
      actorId: 'sher1',
      targetId: 'doc1',
      actionType: 'investigate',
    })
    expect(updatedState.detectiveResults['det1']).toBe('not mafia')
    expect(updatedState.detectiveResults['sher1']).toBe('doctor')
  })
})

describe('sheriffRole — cooldown enforced via validateNightAction', () => {
  it('validate returns error on even night', () => {
    const { validateNightAction } = require('../validate')
    const state = makeState({ nightNumber: 2 })
    const result = validateNightAction(state, { actorId: 'sher1', targetId: 'maf1', actionType: 'investigate' })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/cooldown/)
  })

  it('validate passes on odd night', () => {
    const { validateNightAction } = require('../validate')
    const state = makeState({ nightNumber: 1 })
    const result = validateNightAction(state, { actorId: 'sher1', targetId: 'maf1', actionType: 'investigate' })
    expect(result.valid).toBe(true)
  })
})
