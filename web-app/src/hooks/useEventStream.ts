/**
 * Event Stream Hook
 *
 * Custom React hook for subscribing to SSE events with filtering capabilities.
 * Manages the event stream connection lifecycle based on authentication state.
 */

import { useEffect, useCallback, useRef } from "react";
import { useEventStore, type ConnectionStatus } from "../stores/useEventStore";
import { createEventStream, type ServerEvent, type DocumentType } from "../api/eventStream";
import { useAuthStore, getValidToken } from "../auth/authStore";

interface UseEventStreamOptions {
  /**
   * Filter events by document type
   */
  documentType?: DocumentType;

  /**
   * Filter events by document ID
   */
  documentId?: string;

  /**
   * Callback fired when a matching event is received
   */
  onEvent?: (event: ServerEvent) => void;

  /**
   * Whether to automatically connect when authenticated (default: true)
   */
  autoConnect?: boolean;
}

interface UseEventStreamResult {
  /** Current connection status */
  status: ConnectionStatus;

  /** Error message if any */
  error: string | null;

  /** Recent events (filtered if options provided) */
  events: ServerEvent[];

  /** Manually connect to the event stream */
  connect: () => void;

  /** Disconnect from the event stream */
  disconnect: () => void;

  /** Check if connected */
  isConnected: boolean;
}

/**
 * Hook for subscribing to SSE events.
 *
 * Automatically connects when the user is authenticated and disconnects
 * when they log out or the token expires.
 *
 * @example
 * ```tsx
 * // Subscribe to all events
 * const { events, status } = useEventStream();
 *
 * // Subscribe to specific document type
 * const { events } = useEventStream({ documentType: 'experiment' });
 *
 * // React to events with a callback
 * useEventStream({
 *   documentType: 'experiment',
 *   onEvent: (event) => {
 *     if (event.event_type === 'update') {
 *       refetchExperiments();
 *     }
 *   }
 * });
 * ```
 */
export function useEventStream(options: UseEventStreamOptions = {}): UseEventStreamResult {
  const { documentType, documentId, onEvent, autoConnect = true } = options;

  // Store state
  const status = useEventStore((s) => s.status);
  const error = useEventStore((s) => s.error);
  const recentEvents = useEventStore((s) => s.recentEvents);
  const setStatus = useEventStore((s) => s.setStatus);
  const addEvent = useEventStore((s) => s.addEvent);

  // Auth state
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);

  // Ref to hold the abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filter events based on options
  const events = recentEvents.filter((event) => {
    if (documentType && event.document_type !== documentType) return false;
    if (documentId && event.document_id !== documentId) return false;
    return true;
  });

  // Connect function
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (abortControllerRef.current) {
      return;
    }

    const token = getValidToken();
    if (!token) {
      setStatus("error", "No valid authentication token");
      return;
    }

    setStatus("connecting");

    abortControllerRef.current = createEventStream(token, {
      onOpen: () => {
        setStatus("connected");
      },
      onEvent: (event) => {
        addEvent(event);
      },
      onError: (err) => {
        if ("type" in err && err.type === "token_expired") {
          setStatus("error", "Authentication token expired");
          // The auth store will handle the redirect
        } else {
          setStatus("error", err instanceof Error ? err.message : "Connection error");
        }
        abortControllerRef.current = null;
      },
      onClose: () => {
        if (abortControllerRef.current) {
          setStatus("disconnected");
          abortControllerRef.current = null;
        }
      },
    });
  }, [setStatus, addEvent]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStatus("disconnected");
    }
  }, [setStatus]);

  // Handle event callback
  useEffect(() => {
    if (onEvent && events.length > 0) {
      // Only call for the most recent event if it matches our filters
      const latestEvent = events[0];
      if (latestEvent) {
        onEvent(latestEvent);
      }
    }
  }, [events, onEvent]);

  // Auto-connect/disconnect based on auth state
  useEffect(() => {
    if (!autoConnect) return;

    if (isAuthenticated && accessToken) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [isAuthenticated, accessToken, autoConnect, connect, disconnect]);

  return {
    status,
    error,
    events,
    connect,
    disconnect,
    isConnected: status === "connected",
  };
}
