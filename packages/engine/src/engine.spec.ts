import { GamePhase, Team } from '@mafioso/types'
import type { EngineGameState } from './engine-types'
import {
  checkWinCondition,
  resolveNightPhase,
  resolveDayVote,
  assignRoles,
  processNightAction,
} from './engine'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function p(
  id: string,
  role: string,
  isAlive = true,
): EngineGameState['players'][0] {
  return { id, userId: `u_${id}`, username: id, seat: 0, isAlive, role }
}

function makeState(overrides: Partial<EngineGameState> = {}): EngineGameState {
  return {
    sessionId: 's1',
    roomId: 'r1',
    phase: GamePhase.NIGHT,
    players: [
      p('maf1', 'mafia'),
      p('vil1', 'villager'),
      p('vil2', 'villager'),
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

// ---------------------------------------------------------------------------
// checkWinCondition
// ---------------------------------------------------------------------------

describe('checkWinCondition', () => {
  it('returns VILLAGE when no mafia alive', () => {
    const state = makeState({ players: [p('maf1', 'mafia', false), p('vil1', 'villager')] })
    expect(checkWinCondition(state)).toBe(Team.VILLAGE)
  })

  it('returns MAFIA when mafiaAlive equals villageAlive (1v1)', () => {
    const state = makeState({ players: [p('maf1', 'mafia'), p('vil1', 'villager')] })
    expect(checkWinCondition(state)).toBe(Team.MAFIA)
  })

  it('returns MAFIA when mafia outnumber village', () => {
    const state = makeState({
      players: [p('maf1', 'mafia'), p('maf2', 'mafia'), p('vil1', 'villager')],
    })
    expect(checkWinCondition(state)).toBe(Team.MAFIA)
  })

  it('returns null when game should continue (1 mafia, 2 village)', () => {
    expect(checkWinCondition(makeState())).toBeNull()
  })

  it('does not count dead players', () => {
    const state = makeState({
      players: [p('maf1', 'mafia'), p('vil1', 'villager', false), p('vil2', 'villager', false)],
    })
    // 1 mafia alive, 0 village alive → mafia wins
    expect(checkWinCondition(state)).toBe(Team.MAFIA)
  })

  it('counts doctor as village team', () => {
    const state = makeState({
      players: [p('maf1', 'mafia'), p('doc1', 'doctor'), p('vil1', 'villager')],
    })
    expect(checkWinCondition(state)).toBeNull()
  })

  it('counts detective as village team', () => {
    const state = makeState({
      players: [p('maf1', 'mafia'), p('det1', 'detective'), p('vil1', 'villager')],
    })
    expect(checkWinCondition(state)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// assignRoles
// ---------------------------------------------------------------------------

describe('assignRoles', () => {
  it('assigns exactly one role to every player', () => {
    const state = makeState()
    const roles = ['mafia', 'villager', 'villager']
    const result = assignRoles(state, roles)
    result.players.forEach((p) => {
      expect(p.role).toBeTruthy()
      expect(roles).toContain(p.role)
    })
  })

  it('throws when role count does not match player count', () => {
    const state = makeState()
    expect(() => assignRoles(state, ['mafia', 'villager'])).toThrow()
  })

  it('uses every role exactly once', () => {
    const state = makeState()
    const roles = ['mafia', 'villager', 'villager']
    const result = assignRoles(state, roles)
    const assigned = result.players.map((p) => p.role).sort()
    expect(assigned).toEqual([...roles].sort())
  })

  it('does not mutate the original state', () => {
    const state = makeState()
    const originalRoles = state.players.map((p) => p.role)
    assignRoles(state, ['mafia', 'villager', 'villager'])
    expect(state.players.map((p) => p.role)).toEqual(originalRoles)
  })
})

// ---------------------------------------------------------------------------
// resolveNightPhase
// ---------------------------------------------------------------------------

describe('resolveNightPhase', () => {
  it('kills the target when no doctor saves', () => {
    const state = makeState({
      pendingActions: [{ type: 'KILL', actorId: 'maf1', targetId: 'vil1' }],
    })
    const { nextState } = resolveNightPhase(state)
    const victim = nextState.players.find((pl) => pl.id === 'vil1')!
    expect(victim.isAlive).toBe(false)
  })

  it('doctor save cancels the mafia kill', () => {
    const state = makeState({
      pendingActions: [
        { type: 'KILL', actorId: 'maf1', targetId: 'vil1' },
        { type: 'SAVE', actorId: 'doc1', targetId: 'vil1' },
      ],
    })
    const { nextState, sideEffects } = resolveNightPhase(state)
    expect(nextState.players.find((pl) => pl.id === 'vil1')!.isAlive).toBe(true)
    expect(sideEffects.some((e) => e.type === 'PLAYER_SAVED')).toBe(true)
  })

  it('no kill when no KILL action submitted', () => {
    const state = makeState({
      pendingActions: [{ type: 'SAVE', actorId: 'doc1', targetId: 'vil1' }],
    })
    const { nextState } = resolveNightPhase(state)
    expect(nextState.players.every((pl) => pl.isAlive)).toBe(true)
  })

  it('emits PLAYER_ELIMINATED side effect when kill lands', () => {
    const state = makeState({
      pendingActions: [{ type: 'KILL', actorId: 'maf1', targetId: 'vil1' }],
    })
    const { sideEffects } = resolveNightPhase(state)
    expect(sideEffects.some((e) => e.type === 'PLAYER_ELIMINATED')).toBe(true)
  })

  it('clears pendingActions and nightActionsTaken', () => {
    const state = makeState({
      pendingActions: [{ type: 'KILL', actorId: 'maf1', targetId: 'vil1' }],
      nightActionsTaken: { maf1: true },
    })
    const { nextState } = resolveNightPhase(state)
    expect(nextState.pendingActions).toHaveLength(0)
    expect(nextState.nightActionsTaken).toEqual({})
  })

  it('transitions to DAY_DISCUSSION when game continues', () => {
    const state = makeState({ pendingActions: [] })
    const { nextState } = resolveNightPhase(state)
    expect(nextState.phase).toBe(GamePhase.DAY_DISCUSSION)
  })

  it('transitions to GAME_OVER and sets VILLAGE winner when last mafia killed', () => {
    const state = makeState({
      players: [p('maf1', 'mafia'), p('vil1', 'villager'), p('vil2', 'villager')],
      pendingActions: [{ type: 'KILL', actorId: 'vil1', targetId: 'maf1' }],
    })
    const { nextState, sideEffects } = resolveNightPhase(state)
    expect(nextState.phase).toBe(GamePhase.GAME_OVER)
    expect(nextState.winner).toBe(Team.VILLAGE)
    expect(sideEffects.some((e) => e.type === 'GAME_OVER')).toBe(true)
  })

  it('transitions to GAME_OVER and sets MAFIA winner when mafia kills last villager', () => {
    const state = makeState({
      players: [p('maf1', 'mafia'), p('vil1', 'villager')],
      pendingActions: [{ type: 'KILL', actorId: 'maf1', targetId: 'vil1' }],
    })
    const { nextState } = resolveNightPhase(state)
    expect(nextState.phase).toBe(GamePhase.GAME_OVER)
    expect(nextState.winner).toBe(Team.MAFIA)
  })
})

// ---------------------------------------------------------------------------
// resolveDayVote
// ---------------------------------------------------------------------------

const defaultSettings = { tieVoteRule: 'no_elimination' as const }

describe('resolveDayVote', () => {
  it('eliminates the player with the most votes', () => {
    const state = makeState({
      phase: GamePhase.DAY_VOTING,
      votes: { vil1: 'maf1', vil2: 'maf1' },
    })
    const { nextState } = resolveDayVote(state, defaultSettings)
    expect(nextState.players.find((pl) => pl.id === 'maf1')!.isAlive).toBe(false)
  })

  it('clears votes after resolution', () => {
    const state = makeState({ phase: GamePhase.DAY_VOTING, votes: { vil1: 'maf1' } })
    const { nextState } = resolveDayVote(state, defaultSettings)
    expect(nextState.votes).toEqual({})
  })

  it('emits PLAYER_ELIMINATED side effect', () => {
    const state = makeState({
      phase: GamePhase.DAY_VOTING,
      votes: { vil1: 'maf1', vil2: 'maf1' },
    })
    const { sideEffects } = resolveDayVote(state, defaultSettings)
    expect(sideEffects.some((e) => e.type === 'PLAYER_ELIMINATED')).toBe(true)
  })

  it('no_elimination: keeps everyone alive on tie', () => {
    const state = makeState({
      phase: GamePhase.DAY_VOTING,
      votes: { vil1: 'maf1', vil2: 'vil1' },
    })
    const { nextState } = resolveDayVote(state, { tieVoteRule: 'no_elimination' })
    expect(nextState.players.every((pl) => pl.isAlive)).toBe(true)
  })

  it('random: eliminates one of the tied players', () => {
    const state = makeState({
      phase: GamePhase.DAY_VOTING,
      votes: { vil1: 'maf1', vil2: 'vil1' },
    })
    const { nextState } = resolveDayVote(state, { tieVoteRule: 'random' })
    const eliminated = nextState.players.filter((pl) => !pl.isAlive)
    expect(eliminated).toHaveLength(1)
    expect(['maf1', 'vil1']).toContain(eliminated[0]!.id)
  })

  it('revote: returns REVOTE_NEEDED and resets votes without eliminating', () => {
    const state = makeState({
      phase: GamePhase.DAY_VOTING,
      votes: { vil1: 'maf1', vil2: 'vil1' },
    })
    const { nextState, sideEffects } = resolveDayVote(state, { tieVoteRule: 'revote' })
    expect(sideEffects.some((e) => e.type === 'REVOTE_NEEDED')).toBe(true)
    expect(nextState.votes).toEqual({})
    expect(nextState.players.every((pl) => pl.isAlive)).toBe(true)
  })

  it('no votes cast: skips elimination and transitions to NIGHT', () => {
    const state = makeState({ phase: GamePhase.DAY_VOTING, votes: {} })
    const { nextState } = resolveDayVote(state, defaultSettings)
    expect(nextState.players.every((pl) => pl.isAlive)).toBe(true)
    expect(nextState.phase).toBe(GamePhase.NIGHT)
  })

  it('transitions to GAME_OVER when voting eliminates last mafia', () => {
    const state = makeState({
      phase: GamePhase.DAY_VOTING,
      votes: { vil1: 'maf1', vil2: 'maf1' },
    })
    const { nextState } = resolveDayVote(state, defaultSettings)
    expect(nextState.phase).toBe(GamePhase.GAME_OVER)
    expect(nextState.winner).toBe(Team.VILLAGE)
  })

  it('transitions to GAME_OVER when voting creates mafia majority', () => {
    const state = makeState({
      players: [p('maf1', 'mafia'), p('maf2', 'mafia'), p('vil1', 'villager')],
      phase: GamePhase.DAY_VOTING,
      votes: { maf1: 'vil1', maf2: 'vil1' },
    })
    const { nextState } = resolveDayVote(state, defaultSettings)
    expect(nextState.phase).toBe(GamePhase.GAME_OVER)
    expect(nextState.winner).toBe(Team.MAFIA)
  })
})

// ---------------------------------------------------------------------------
// processNightAction (integration)
// ---------------------------------------------------------------------------

describe('processNightAction', () => {
  it('adds KILL to pendingActions for mafia actor', () => {
    const state = makeState()
    const { nextState } = processNightAction(state, {
      actorId: 'maf1',
      targetId: 'vil1',
      actionType: 'kill',
    })
    expect(nextState.pendingActions.some((a) => a.type === 'KILL' && a.targetId === 'vil1')).toBe(
      true,
    )
  })

  it('marks actor as having acted', () => {
    const state = makeState()
    const { nextState } = processNightAction(state, {
      actorId: 'maf1',
      targetId: 'vil1',
      actionType: 'kill',
    })
    expect(nextState.nightActionsTaken['maf1']).toBe(true)
  })

  it('throws when actor already acted this phase', () => {
    const state = makeState({ nightActionsTaken: { maf1: true } })
    expect(() =>
      processNightAction(state, { actorId: 'maf1', targetId: 'vil1', actionType: 'kill' }),
    ).toThrow('Already acted this phase')
  })

  it('throws when target is dead', () => {
    const state = makeState({ players: [p('maf1', 'mafia'), p('vil1', 'villager', false), p('vil2', 'villager')] })
    expect(() =>
      processNightAction(state, { actorId: 'maf1', targetId: 'vil1', actionType: 'kill' }),
    ).toThrow('Target is not alive')
  })

  it('returns privateResult for detective', () => {
    const state = makeState({
      players: [p('det1', 'detective'), p('maf1', 'mafia'), p('vil1', 'villager')],
    })
    const { privateResult } = processNightAction(state, {
      actorId: 'det1',
      targetId: 'maf1',
      actionType: 'investigate',
    })
    expect(privateResult).toBe('mafia')
  })
})
