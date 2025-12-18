import { useEffect, useRef, useState } from "react"
import { useSearchFilterStore } from "../stores/useSearchFilterStore"

interface SearchFilterInputProps {
  className?: string
  placeholder?: string
  debounceDelayMs?: number
}

const DEFAULT_DEBOUNCE_DELAY_MS = 300

export default function SearchFilterInput(props: SearchFilterInputProps) {
  const {
    className,
    placeholder = "Filter by name...",
    debounceDelayMs = DEFAULT_DEBOUNCE_DELAY_MS,
  } = props
  const filterText = useSearchFilterStore((state) => state.filterText)
  const setFilterText = useSearchFilterStore((state) => state.setFilterText)

  const [localValue, setLocalValue] = useState(filterText)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLocalValue(filterText)
  }, [filterText])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const scheduleStoreUpdate = (value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      setFilterText(value)
    }, debounceDelayMs)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalValue(value)
    scheduleStoreUpdate(value)
  }

  const handleClearSearch = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    setLocalValue("")
    setFilterText("")
  }

  const labelClassName = [
    "input input-bordered flex items-center gap-2 w-64 rounded-full",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <label className={labelClassName} data-tour="search-filter">
      <svg
        className="h-4 w-4 opacity-50"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <g
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeWidth="2.5"
          fill="none"
          stroke="currentColor"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </g>
      </svg>
      <input
        type="search"
        className="grow bg-transparent outline-none"
        placeholder={placeholder}
        value={localValue}
        onChange={handleSearchChange}
      />
      {localValue && (
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle"
          onClick={handleClearSearch}
          aria-label="Clear search"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </label>
  )
}
