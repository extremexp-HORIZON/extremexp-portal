import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthPage } from './components/auth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { EventStreamProvider } from './components/EventStreamProvider'
import { configureClient } from './api/clientConfig'

// Configure API client with auth interceptors
configureClient()

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route path="/auth" element={<AuthPage redirectTo="/" />} />
          <Route path="/auth/register" element={<AuthPage defaultTab="register" redirectTo="/" />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth/register" replace />} />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <EventStreamProvider>
                  <App />
                </EventStreamProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
