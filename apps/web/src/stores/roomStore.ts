import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface RoomStore {
  roomCode: string | null
  setRoomCode: (code: string) => void
}

export const useRoomStore = create<RoomStore>()(
  immer((set) => ({
    roomCode: null,
    setRoomCode: (code) => {
      set((draft) => {
        draft.roomCode = code
      })
    },
  })),
)
