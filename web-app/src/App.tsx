import "./App.css"
import { Routes, Route } from "react-router-dom"
import { MainLayout } from "./components/MainLayout"
import { Dashboard } from "./components/Dashboard"
import { ExternalFrame } from "./components/ExternalFrame"

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        {/* External tool routes - each tool type has its own route for proper history */}
        {/* Management tools (no params) */}
        <Route path="access-control" element={<ExternalFrame />} />
        <Route path="data-management" element={<ExternalFrame />} />
        {/* Experiment tools (require experimentId) */}
        <Route path="experiment/:experimentId/intent-editor" element={<ExternalFrame />} />
        <Route path="experiment/:experimentId/graphical-editor" element={<ExternalFrame />} />
        <Route path="experiment/:experimentId/code-editor" element={<ExternalFrame />} />
        <Route path="experiment/:experimentId/schedule" element={<ExternalFrame />} />
        {/* Workflow tools (require workflowId) */}
        <Route path="workflow/:workflowId/code-editor" element={<ExternalFrame />} />
        {/* Observe & Analyze tools (optional experimentId) */}
        <Route path="gamification/:experimentId?" element={<ExternalFrame />} />
        <Route path="experiment-card/:experimentId?" element={<ExternalFrame />} />
      </Route>
    </Routes>
  )
}

export default App
