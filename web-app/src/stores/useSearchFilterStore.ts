/**
 * Search Filter Store
 *
 * Zustand store for managing global search filter state.
 * Used to filter tables across the dashboard (experiments, workflows, etc.)
 * Supports regex matching for case-insensitive name filtering.
 */

import { create } from "zustand"

interface SearchFilterState {
  /** The debounced filter text that components should use for filtering */
  filterText: string
}

interface SearchFilterActions {
  /** Set the filter text (should be called with debounced value) */
  setFilterText: (text: string) => void

  /** Clear the filter */
  clearFilter: () => void
}

type SearchFilterStore = SearchFilterState & SearchFilterActions

const initialState: SearchFilterState = {
  filterText: "",
}

export const useSearchFilterStore = create<SearchFilterStore>((set) => ({
  ...initialState,

  setFilterText: (text) => set({ filterText: text }),

  clearFilter: () => set(initialState),
}))

/**
 * Identity filter that matches all names.
 * Used as a fast path when no filter text is provided.
 */
const MATCH_ALL_FILTER = () => true

/**
 * Create a filter function that matches names against the filter pattern.
 * Supports regex patterns for advanced filtering.
 * Case-insensitive by default.
 *
 * @param filterText - The filter pattern (plain text or regex)
 * @returns A filter function that takes a name and returns true if it matches
 */
export function createNameFilter(filterText: string): (name: string) => boolean {
  // Fast path: empty filter matches everything
  if (!filterText.trim()) {
    return MATCH_ALL_FILTER
  }

  try {
    // Try to create a case-insensitive regex from the filter text
    const regex = new RegExp(filterText, "i")
    return (name: string) => regex.test(name)
  } catch {
    // If the regex is invalid, fall back to simple case-insensitive includes
    const lowerFilter = filterText.toLowerCase()
    return (name: string) => name.toLowerCase().includes(lowerFilter)
  }
}

/**
 * Selector for the filter text
 */
export const selectFilterText = (state: SearchFilterStore) =>
  state.filterText
