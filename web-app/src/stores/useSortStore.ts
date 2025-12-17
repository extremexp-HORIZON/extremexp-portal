/**
 * Sort Store
 *
 * Zustand store for managing table sorting state.
 * Each table context (e.g., 'experiments', 'workflows', 'dalExperiments')
 * can have its own independent sort configuration.
 */

import { create } from "zustand"

/** Sort direction */
export type SortDirection = "asc" | "desc" | null

/** Sort configuration for a single column */
export interface SortConfig {
  /** The key/column to sort by */
  key: string
  /** Sort direction: 'asc', 'desc', or null for no sorting */
  direction: SortDirection
}

/** Map of table context to its sort configuration */
type SortState = Record<string, SortConfig | undefined>

interface SortStoreState {
  /** Sort configurations keyed by table context */
  sorts: SortState
}

interface SortStoreActions {
  /**
   * Toggle sort for a column in a specific table context.
   * Cycles through: null -> asc -> desc -> null
   */
  toggleSort: (context: string, key: string) => void

  /**
   * Set sort directly for a column in a specific table context.
   */
  setSort: (context: string, key: string, direction: SortDirection) => void

  /**
   * Clear sort for a specific table context.
   */
  clearSort: (context: string) => void

  /**
   * Get sort config for a specific table context.
   */
  getSort: (context: string) => SortConfig | undefined
}

type SortStore = SortStoreState & SortStoreActions

/** Default sort configurations for each table context */
const DEFAULT_SORTS: SortState = {
  experiments: { key: "created_at", direction: "desc" },
  workflows: { key: "created_at", direction: "desc" },
  dalExperiments: { key: "start", direction: "desc" },
}

export const useSortStore = create<SortStore>((set, get) => ({
  sorts: { ...DEFAULT_SORTS },

  toggleSort: (context, key) =>
    set((state) => {
      const current = state.sorts[context]

      // If clicking a different column, start with ascending
      if (!current || current.key !== key) {
        return {
          sorts: {
            ...state.sorts,
            [context]: { key, direction: "asc" },
          },
        }
      }

      // Cycle through: asc -> desc -> null
      const nextDirection: SortDirection =
        current.direction === "asc"
          ? "desc"
          : current.direction === "desc"
            ? null
            : "asc"

      return {
        sorts: {
          ...state.sorts,
          [context]: nextDirection ? { key, direction: nextDirection } : undefined,
        },
      }
    }),

  setSort: (context, key, direction) =>
    set((state) => ({
      sorts: {
        ...state.sorts,
        [context]: direction ? { key, direction } : undefined,
      },
    })),

  clearSort: (context) =>
    set((state) => ({
      sorts: {
        ...state.sorts,
        [context]: undefined,
      },
    })),

  getSort: (context) => get().sorts[context],
}))

/**
 * Selector to get sort config for a specific context
 */
export const selectSort = (context: string) => (state: SortStore) =>
  state.sorts[context]

/**
 * Generic sort function that can be used with any array of objects.
 * Handles strings, numbers, dates, and null/undefined values.
 *
 * @param items - Array of items to sort
 * @param sortConfig - Sort configuration (key and direction)
 * @returns Sorted array (new array, doesn't mutate original)
 */
export function sortItems<T extends Record<string, unknown>>(
  items: T[],
  sortConfig: SortConfig | undefined
): T[] {
  if (!sortConfig || !sortConfig.direction) {
    return items
  }

  const { key, direction } = sortConfig

  return [...items].sort((a, b) => {
    const aValue = a[key]
    const bValue = b[key]

    // Handle null/undefined - push to end
    if (aValue == null && bValue == null) return 0
    if (aValue == null) return 1
    if (bValue == null) return -1

    let comparison = 0

    // Handle dates (string dates or Date objects)
    if (
      (typeof aValue === "string" && typeof bValue === "string") ||
      (aValue instanceof Date && bValue instanceof Date)
    ) {
      const aDate = aValue instanceof Date ? aValue : new Date(aValue)
      const bDate = bValue instanceof Date ? bValue : new Date(bValue)

      // Check if both are valid dates
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
        comparison = aDate.getTime() - bDate.getTime()
      } else {
        // Fall back to string comparison
        comparison = String(aValue).localeCompare(String(bValue))
      }
    }
    // Handle numbers
    else if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue
    }
    // Handle strings
    else {
      comparison = String(aValue).localeCompare(String(bValue))
    }

    return direction === "desc" ? -comparison : comparison
  })
}
