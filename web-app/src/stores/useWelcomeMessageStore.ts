import { create } from "zustand"
import { persist } from "zustand/middleware"

type WelcomeMessageStore = {
  isDisabled: boolean
  disable: () => void
  reset: () => void
}

export const useWelcomeMessageStore = create(
  persist<WelcomeMessageStore>(
    (set) => ({
      isDisabled: false,
      disable: () => set({ isDisabled: true }),
      reset: () => set({ isDisabled: false }),
    }),
    { name: "welcome-message-preferences" },
  ),
)
