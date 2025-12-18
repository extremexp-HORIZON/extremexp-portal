import { create } from "zustand"

export interface ExternalFrameState {
  /** The URL of the currently open external tool */
  url: string | null
  /** The title of the currently open external tool (for display in navbar) */
  title: string | null
  /** Sets the current external frame info */
  setFrame: (url: string, title: string) => void
  /** Clears the external frame info */
  clearFrame: () => void
}

/**
 * Store for managing the currently open external tool frame.
 * Used to display the tool name in the navbar and load the correct URL in the iframe.
 */
export const useExternalFrameStore = create<ExternalFrameState>((set) => ({
  url: null,
  title: null,
  setFrame: (url, title) => set({ url, title }),
  clearFrame: () => set({ url: null, title: null }),
}))
