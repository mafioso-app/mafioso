import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface UiState {
  isReconnecting: boolean
  announcement: string | null
}

interface UiActions {
  setReconnecting(value: boolean): void
  setAnnouncement(msg: string | null): void
}

let announcementTimer: ReturnType<typeof setTimeout> | null = null

export const useUiStore = create<UiState & UiActions>()(
  immer((set) => ({
    isReconnecting: false,
    announcement: null,

    setReconnecting(value: boolean) {
      set((draft) => {
        draft.isReconnecting = value
      })
    },

    setAnnouncement(msg: string | null) {
      if (announcementTimer) {
        clearTimeout(announcementTimer)
        announcementTimer = null
      }
      set((draft) => {
        draft.announcement = msg
      })
      if (msg !== null) {
        announcementTimer = setTimeout(() => {
          set((draft) => {
            draft.announcement = null
          })
          announcementTimer = null
        }, 5000)
      }
    },
  })),
)
