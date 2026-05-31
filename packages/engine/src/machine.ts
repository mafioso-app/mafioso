import { createMachine } from 'xstate'
import { GamePhase } from '@mafioso/types'

export const gameMachine = createMachine({
  id: 'mafia-game',
  initial: GamePhase.LOBBY,
  states: {
    [GamePhase.LOBBY]: {
      on: { START_GAME: GamePhase.NIGHT },
    },
    [GamePhase.NIGHT]: {
      on: { NIGHT_END: GamePhase.DAY_DISCUSSION },
    },
    [GamePhase.DAY_DISCUSSION]: {
      on: { DISCUSSION_END: GamePhase.DAY_VOTING },
    },
    [GamePhase.DAY_VOTING]: {
      on: {
        VOTING_END: GamePhase.NIGHT,
        GAME_OVER: GamePhase.GAME_OVER,
      },
    },
    [GamePhase.GAME_OVER]: {
      type: 'final',
    },
  },
})
