/**
 * Event Store
 *
 * Zustand store for managing SSE event stream state and events.
 * Provides connection status and recent events for consumption by components.
 */

import { create } from "zustand";
import type { ServerEvent } from "../api/eventStream";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface EventState {
  /** Current connection status */
  status: ConnectionStatus;

  /** Error message if status is 'error' */
  error: string | null;

  /** Recent events (kept limited to prevent memory issues) */
  recentEvents: ServerEvent[];

  /** Maximum number of events to keep in memory */
  maxEvents: number;
}

interface EventActions {
  /** Set connection status */
  setStatus: (status: ConnectionStatus, error?: string) => void;

  /** Add a new event */
  addEvent: (event: ServerEvent) => void;

  /** Clear all events */
  clearEvents: () => void;

  /** Reset store to initial state */
  reset: () => void;
}

type EventStore = EventState & EventActions;

const initialState: EventState = {
  status: "disconnected",
  error: null,
  recentEvents: [],
  maxEvents: 100,
};

export const useEventStore = create<EventStore>((set) => ({
  ...initialState,

  setStatus: (status, error) =>
    set({
      status,
      error: error ?? null,
    }),

  addEvent: (event) =>
    set((state) => {
      const newEvents = [event, ...state.recentEvents];
      // Keep only the most recent events
      if (newEvents.length > state.maxEvents) {
        newEvents.pop();
      }
      return { recentEvents: newEvents };
    }),

  clearEvents: () => set({ recentEvents: [] }),

  reset: () => set(initialState),
}));

/**
 * Selector for getting events of a specific document type
 */
export const selectEventsByType = (type: ServerEvent["document_type"]) => (state: EventStore) =>
  state.recentEvents.filter((e) => e.document_type === type);

/**
 * Selector for getting the latest event for a specific document
 */
export const selectLatestEventForDocument =
  (documentId: string) => (state: EventStore) =>
    state.recentEvents.find((e) => e.document_id === documentId);
