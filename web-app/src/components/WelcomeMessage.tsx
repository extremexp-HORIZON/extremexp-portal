import { useState } from "react"
import type { MouseEventHandler } from "react"
import { useWelcomeMessageStore } from "../stores/useWelcomeMessageStore"

const DEFAULT_MESSAGE =
  "Welcome to ExtremeXP - an interactive platform for data scientists and domain experts to define, run, and evaluate machine learning experiments."

type WelcomeMessageProps = {
  message?: string
  onDisable?: MouseEventHandler<HTMLButtonElement>
  onTour?: MouseEventHandler<HTMLButtonElement>
  onDismiss?: MouseEventHandler<HTMLButtonElement>
}

export default function WelcomeMessage({
  message = DEFAULT_MESSAGE,
  onDisable,
  onTour,
  onDismiss,
}: WelcomeMessageProps) {
  const disable = useWelcomeMessageStore((state) => state.disable)
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) {
    return null
  }

  const handleDismiss: MouseEventHandler<HTMLButtonElement> = (event) => {
    setIsVisible(false)
    onDismiss?.(event)
  }

  const handleDisable: MouseEventHandler<HTMLButtonElement> = (event) => {
    setIsVisible(false)
    disable()
    onDisable?.(event)
  }

  return (
    <section className="card rounded-[20px] bg-base-100 shadow-sm">
      <div className="card-body gap-5 p-6">
        <div className="flex items-start gap-4">
          <p className="flex-1 text-base text-neutral-700">{message}</p>
          <button
            type="button"
            aria-label="Dismiss welcome message"
            className="btn btn-circle btn-ghost btn-sm text-info"
            onClick={handleDismiss}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17 7 7 17M7 7l10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn border-none bg-[#c0fedc]/60 text-neutral-700 hover:bg-[#a5f1c9] rounded-lg"
            onClick={handleDisable}
          >
            No longer appears
          </button>
          <button
            type="button"
            className="btn border-none bg-[#c0fedc] text-neutral-700 hover:bg-[#94ecbc] rounded-lg"
            onClick={onTour}
          >
            Have a quick tour
          </button>
        </div>
      </div>
    </section>
  )
}
