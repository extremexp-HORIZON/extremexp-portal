import { useWelcomeMessageStore } from "../stores/useWelcomeMessageStore"
import { useTour } from "../hooks/useTour"
import WelcomeMessage from "./WelcomeMessage"
import QuickStart from "./QuickStart"
import Prepare from "./Prepare"
import DefineAndRun from "./DefineAndRun"
import ObserveAndAnalyze from "./ObserveAndAnalyze"

/**
 * Dashboard page component.
 * The main landing page displaying all dashboard sections.
 */
export function Dashboard() {
  const isWelcomeDisabled = useWelcomeMessageStore((state) => state.isDisabled)
  const { startTour } = useTour()

  return (
    <div className="flex-1 overflow-y-auto bg-blue-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        {!isWelcomeDisabled && <WelcomeMessage onTour={startTour} />}
        <QuickStart />
        <Prepare />
        <DefineAndRun />
        <ObserveAndAnalyze />
      </div>
    </div>
  )
}
