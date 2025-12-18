/** Default page size for all tables */
export const PAGE_SIZE = 10

interface PaginationProps {
  /** Total number of items */
  totalItems: number
  /** Current page (1-indexed) */
  currentPage: number
  /** Callback when page changes */
  onPageChange: (page: number) => void
  /** Page size (defaults to PAGE_SIZE constant) */
  pageSize?: number
}

/**
 * DaisyUI pagination component that only renders when items exceed page size
 */
export default function Pagination({
  totalItems,
  currentPage,
  onPageChange,
  pageSize = PAGE_SIZE,
}: PaginationProps) {
  // Don't render if items fit on one page
  if (totalItems <= pageSize) {
    return null
  }

  const totalPages = Math.ceil(totalItems / pageSize)

  // Generate page numbers to display
  const pageNumbers = (() => {
    const pages: (number | "ellipsis")[] = []

    if (totalPages <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push("ellipsis")
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis")
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  })()

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
      <p className="text-sm text-neutral-500">
        {startItem}-{endItem} of {totalItems} items
      </p>
      <div className="join">
        <button
          type="button"
          className="join-item btn btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          «
        </button>
        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <button
              key={`ellipsis-${index}`}
              type="button"
              className="join-item btn btn-sm btn-disabled"
              disabled
            >
              …
            </button>
          ) : (
            <button
              key={page}
              type="button"
              className={`join-item btn btn-sm ${currentPage === page ? "btn-active" : ""}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        )}
        <button
          type="button"
          className="join-item btn btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          »
        </button>
      </div>
    </div>
  )
}
