/**
 * SSE Event Stream Client
 *
 * Handles Server-Sent Events connection to the experiments server.
 * Uses ky for HTTP requests and parse-sse for parsing SSE events.
 *
 * This module provides a low-level API for connecting to the event stream.
 * For React components, use the useEventStream hook or EventStreamProvider.
 */

import ky, { type KyInstance } from "ky";
import { parseServerSentEvents, type ServerSentEvent } from "parse-sse";
import { client } from "../client/client.gen";

/**
 * Event types emitted by the server
 */
export type DocumentType = "experiment" | "workflow" | "task" | "category";
export type EventType = "insert" | "update" | "delete";

/**
 * Parsed event data from the SSE stream
 */
export interface ServerEvent {
  document_type: DocumentType;
  document_id: string;
  event_type: EventType;
}

/**
 * Error event sent when authentication fails
 */
export interface ServerErrorEvent {
  type: "token_expired";
  message: string;
}

/**
 * Callback types for event stream
 */
export interface EventStreamCallbacks {
  onEvent?: (event: ServerEvent) => void;
  onError?: (error: ServerErrorEvent | Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * Creates an SSE event stream connection to the experiments server.
 *
 * @param token - Bearer token for authentication
 * @param callbacks - Event callbacks
 * @returns AbortController to cancel the stream
 */
export function createEventStream(
  token: string,
  callbacks: EventStreamCallbacks
): AbortController {
  const abortController = new AbortController();

  // Get base URL from the generated client config
  const baseUrl = (client.getConfig().baseUrl as string) || "";

  // Create a ky instance with auth header
  const api: KyInstance = ky.create({
    prefixUrl: baseUrl,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    //signal: abortController.signal,
    timeout: false, // SSE streams are long-lived
  });

  // Start the stream in an async IIFE
  (async () => {
    try {
      const response = await api.get("events");
      callbacks.onOpen?.();

      const stream = parseServerSentEvents(response);
      const reader = stream.getReader();
      const abortListener = () => {
        reader.cancel().catch(() => undefined);
      };
      abortController.signal.addEventListener("abort", abortListener);

      try {
        while (!abortController.signal.aborted) {
          const { value: event, done } = await reader.read();
          if (done) {
            break;
          }

          try {
            const parsedEvent = parseEvent(event);
            if (!parsedEvent) {
              continue;
            }

            if ("type" in parsedEvent && parsedEvent.type === "token_expired") {
              callbacks.onError?.(parsedEvent as ServerErrorEvent);
              break;
            }

            callbacks.onEvent?.(parsedEvent as ServerEvent);
          } catch (parseError) {
            console.warn("Failed to parse SSE event:", parseError, event);
          }
        }
      } finally {
        abortController.signal.removeEventListener("abort", abortListener);
        reader.releaseLock();
      }
    } catch (error) {
      // Only report errors if not aborted intentionally
      if (!abortController.signal.aborted) {
        callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      callbacks.onClose?.();
    }
  })();

  return abortController;
}

/**
 * Parse an SSE event into our typed event structure
 */
function parseEvent(event: ServerSentEvent): ServerEvent | ServerErrorEvent | null {
  if (!event.data) {
    return null;
  }

  const data = JSON.parse(event.data);

  // Check for error events (SSE type field is 'type' in parse-sse)
  if (event.type === "error" || data.type === "token_expired") {
    return data as ServerErrorEvent;
  }

  // Regular event
  return data as ServerEvent;
}
