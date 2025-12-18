import { useCallback, useState } from "react"

type SetPageAction = number | ((previousPage: number) => number)

interface PaginationState {
  page: number
  key: unknown
}

/**
 * Pagination state that resets to the initial page whenever the reset key changes.
 *
 * This avoids using effects to synchronize state derived from other values, keeping
 * pagination state local to the component that uses it.
 */
export function useResettablePagination(resetKey: unknown, initialPage = 1) {
  const [state, setState] = useState<PaginationState>({
    page: initialPage,
    key: resetKey,
  })

  const currentPage = state.key === resetKey ? state.page : initialPage

  const setCurrentPage = useCallback(
    (action: SetPageAction) => {
      setState((previous) => {
        const previousPage = previous.key === resetKey ? previous.page : initialPage
        const nextPage = typeof action === "function" ? action(previousPage) : action

        return {
          page: nextPage,
          key: resetKey,
        }
      })
    },
    [resetKey, initialPage],
  )

  return [currentPage, setCurrentPage] as const
}
