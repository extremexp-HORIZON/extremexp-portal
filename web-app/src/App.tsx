import "./App.css"
import ExtremeXpNavbar from "./components/ExtremeXpNavbar"
import Prepare from "./components/Prepare"
import QuickStart from "./components/QuickStart"
import WelcomeMessage from "./components/WelcomeMessage"
import DefineAndRun from "./components/DefineAndRun"
import ObserveAndAnalyze from "./components/ObserveAndAnalyze"
import { useWelcomeMessageStore } from "./stores/useWelcomeMessageStore"
import { useTour } from "./hooks/useTour"

function App() {
  const isWelcomeDisabled = useWelcomeMessageStore((state) => state.isDisabled)
  const { startTour } = useTour()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 bg-base-100 shadow-sm">
        <ExtremeXpNavbar />
      </header>
      <main className="flex-1 overflow-y-auto bg-blue-50">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
          {!isWelcomeDisabled && <WelcomeMessage onTour={startTour} />}
          <QuickStart />
          <Prepare />
          <DefineAndRun />
          <ObserveAndAnalyze />
        </div>
      </main>
    </div>
  )
}

export default App
