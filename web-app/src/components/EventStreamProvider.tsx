/**
 * Event Stream Provider
 *
 * A component that manages the SSE event stream connection lifecycle.
 * Place this high in the component tree (but inside ProtectedRoute) to
 * automatically connect when authenticated and disconnect on logout.
 *
 * This component doesn't render any visible UI - it just manages the
 * connection and optionally shows a status indicator.
 *
 * When SSE events are received, it automatically invalidates the relevant
 * query caches (experiments/workflows) to refresh the UI tables.
 */

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createEventStream, type ServerEvent, type ServerErrorEvent } from "../api/eventStream";
import { useEventStore } from "../stores/useEventStore";
import { useAuthStore, getValidToken, isTokenExpired } from "../auth/authStore";
import {
  listExperimentsExperimentsGetQueryKey,
  listWorkflowsWorkflowsGetQueryKey,
} from "../client/@tanstack/react-query.gen";

interface EventStreamProviderProps {
  children: React.ReactNode;

  /**
   * Whether to show a connection status indicator (default: false)
   */
  showStatus?: boolean;

  /**
   * Reconnection delay in ms after disconnection (default: 3000)
   */
  reconnectDelay?: number;

  /**
   * Maximum reconnection attempts before giving up (default: 5)
   */
  maxReconnectAttempts?: number;
}

/**
 * Provider component that manages the SSE event stream connection.
 *
 * @example
 * ```tsx
 * // In your app structure (inside ProtectedRoute):
 * <EventStreamProvider>
 *   <App />
 * </EventStreamProvider>
 *
 * // With status indicator:
 * <EventStreamProvider showStatus>
 *   <App />
 * </EventStreamProvider>
 * ```
 */
export function EventStreamProvider({
  children,
  showStatus = false,
  reconnectDelay = 3000,
  maxReconnectAttempts = 5,
}: EventStreamProviderProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => void>(() => { });

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Store actions
  const setStatus = useEventStore((s) => s.setStatus);
  const addEvent = useEventStore((s) => s.addEvent);
  const reset = useEventStore((s) => s.reset);

  // Auth state
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  /**
   * Invalidate query caches based on event type.
   * This allows concurrent use from other windows/systems to update the UI.
   */
  const invalidateQueriesForEvent = useCallback((event: ServerEvent) => {
    switch (event.document_type) {
      case "experiment":
        queryClient.invalidateQueries({ queryKey: listExperimentsExperimentsGetQueryKey() });
        break;
      case "workflow":
        queryClient.invalidateQueries({ queryKey: listWorkflowsWorkflowsGetQueryKey() });
        break;
      // task and category events could be handled here in the future
    }
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // Clean up any existing connection
    disconnect();

    // Check if we should connect
    if (!isAuthenticated || isTokenExpired()) {
      setStatus("disconnected");
      return;
    }

    const token = getValidToken();
    if (!token) {
      setStatus("error", "No valid authentication token");
      return;
    }

    setStatus("connecting");

    const handleEvent = (event: ServerEvent) => {
      // Add to event store for debugging/monitoring
      addEvent(event);
      // Invalidate relevant query caches to refresh UI tables
      invalidateQueriesForEvent(event);
    };

    const handleError = (err: ServerErrorEvent | Error) => {
      if ("type" in err && err.type === "token_expired") {
        // Token expired - clear auth and let the auth system handle redirect
        setStatus("error", "Authentication token expired");
        disconnect();
        clearAuth();
        return;
      }

      // Other error - attempt reconnection
      const errorMessage = err instanceof Error ? err.message : "Connection error";
      setStatus("error", errorMessage);

      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        console.log(
          `SSE connection error, reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
        );
        reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), reconnectDelay);
      } else {
        console.error("SSE: Max reconnection attempts reached");
      }
    };

    const handleOpen = () => {
      setStatus("connected");
      reconnectAttemptsRef.current = 0; // Reset on successful connection
    };

    const handleClose = () => {
      // Only update status if we didn't abort intentionally
      if (abortControllerRef.current && isAuthenticated && !isTokenExpired()) {
        // Unexpected close - try to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(
            `SSE connection closed unexpectedly, reconnecting (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          );
          reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), reconnectDelay);
        }
      }
    };

    abortControllerRef.current = createEventStream(token, {
      onEvent: handleEvent,
      onError: handleError,
      onOpen: handleOpen,
      onClose: handleClose,
    });
  }, [
    isAuthenticated,
    disconnect,
    setStatus,
    addEvent,
    invalidateQueriesForEvent,
    clearAuth,
    reconnectDelay,
    maxReconnectAttempts,
  ]);

  // Keep connectRef in sync with connect
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
      reset();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect, reset]);

  return (
    <>
      {showStatus && <EventStreamStatusIndicator />}
      {children}
    </>
  );
}

/**
 * Optional status indicator component
 */
function EventStreamStatusIndicator() {
  const status = useEventStore((s) => s.status);
  const error = useEventStore((s) => s.error);

  const statusConfig = {
    disconnected: { color: "bg-gray-400", text: "Offline" },
    connecting: { color: "bg-yellow-400", text: "Connecting..." },
    connected: { color: "bg-green-500", text: "Live" },
    error: { color: "bg-red-500", text: error || "Error" },
  };

  const config = statusConfig[status];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 rounded-full bg-base-200 px-3 py-1.5 shadow-lg">
        <span
          className={`h-2 w-2 rounded-full ${config.color} ${status === "connecting" ? "animate-pulse" : ""}`}
        />
        <span className="text-xs text-base-content/70">{config.text}</span>
      </div>
    </div>
  );
}
