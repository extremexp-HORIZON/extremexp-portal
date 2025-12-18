import { useCallback } from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"

const TOUR_STEPS = [
  {
    element: "#user-menu",
    popover: {
      title: "Your Account",
      description: "Access your profile and logout from here.",
    },
  },
  {
    element: '[data-tour="prepare"]',
    popover: {
      title: "Prepare",
      description: "Upload datasets and configure access control policies.",
    },
  },
  {
    element: '[data-tour="create-experiment"]',
    popover: {
      title: "Create Experiment",
      description: "Start here to define a new experiment.",
    },
  },
  {
    element: '[data-tour="experiments-table"]',
    popover: {
      title: "Your Experiments",
      description: "View, edit, run, and manage your experiments.",
    },
  },
  {
    element: '[data-tour="observe-and-analyze"]',
    popover: {
      title: "Observe & Analyze",
      description: "Monitor running experiments and analyze results.",
    },
  },
  {
    element: '[data-tour="search-filter"]',
    popover: {
      title: "Search & Filter",
      description: "Quickly find experiments by name. Type to filter the list in real-time.",
    },
  },
]

export function useTour() {
  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: "black",
      stagePadding: 8,
      popoverClass: "extremexp-tour-popover",
      steps: TOUR_STEPS,
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Done ✓",
    })

    driverObj.drive()
  }, [])

  return { startTour }
}
