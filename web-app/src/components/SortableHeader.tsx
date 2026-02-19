/**
 * SortableHeader Component
 *
 * A clickable table header cell that displays sort indicators and
 * handles sort toggle interactions.
 */

import type { SortDirection } from "../stores/useSortStore"

interface SortableHeaderProps {
  /** Column display label */
  label: string
  /** Column key for sorting */
  sortKey: string
  /** Current sort direction for this column (null if not sorted) */
  currentDirection: SortDirection
  /** Callback when header is clicked to toggle sort */
  onSort: (key: string) => void
  /** Optional additional content (e.g., filter icon) */
  children?: React.ReactNode
}

/**
 * Ascending sort icon (arrow pointing up)
 */
function SortAscIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 12 12"
    >
      <path d="M6 2v8M3 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Descending sort icon (arrow pointing down)
 */
function SortDescIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 12 12"
    >
      <path d="M6 10V2M3 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Inactive sort icon (both arrows, neutral state)
 */
function SortInactiveIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 text-neutral-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 12 12"
    >
      <path
        d="M3 4l3-3 3 3M3 8l3 3 3-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Get the appropriate sort icon based on direction
 */
function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === "asc") return <SortAscIcon />
  if (direction === "desc") return <SortDescIcon />
  return <SortInactiveIcon />
}

/**
 * Sortable table header component.
 * Displays a clickable header with sort direction indicator.
 */
export default function SortableHeader({
  label,
  sortKey,
  currentDirection,
  onSort,
  children,
}: SortableHeaderProps) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer group uppercase"
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label}${currentDirection === "asc" ? ", currently ascending" : currentDirection === "desc" ? ", currently descending" : ""}`}
    >
      {label}
      {children}
      <span className="group-hover:opacity-100 transition-opacity">
        <SortIcon direction={currentDirection} />
      </span>
    </button>
  )
}

/**
 * Filter icon component (can be used alongside SortableHeader)
 */
export function FilterIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5 text-neutral-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox="0 0 20 20"
    >
      <path
        d="M3 5h14M6 10h8M9 15h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
