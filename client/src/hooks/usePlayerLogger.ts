import { useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth";

interface LogEvent {
  eventType: string;
  videoId?: string;
  videoIndex?: number;
  playerState?: number;
  payload?: Record<string, unknown>;
  timestamp?: number;
}

const SESSION_ID = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
const FLUSH_INTERVAL = 5000; // Flush every 5 seconds
const MAX_BUFFER_SIZE = 20; // Flush if buffer exceeds this size

export function usePlayerLogger() {
  const { user } = useAuth();
  const bufferRef = useRef<LogEvent[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFlushingRef = useRef(false);

  // Only log for superadmin
  const shouldLog = user?.role === "superadmin";

  const flush = useCallback(async () => {
    if (!shouldLog || bufferRef.current.length === 0 || isFlushingRef.current) {
      return;
    }

    isFlushingRef.current = true;
    const eventsToSend = [...bufferRef.current];
    bufferRef.current = [];

    try {
      await fetch("/api/player-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          events: eventsToSend,
          sessionId: SESSION_ID,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      // Silently fail - don't block playback for logging
      console.debug("Failed to send player logs:", error);
      // Put events back in buffer for retry
      bufferRef.current = [...eventsToSend, ...bufferRef.current];
    } finally {
      isFlushingRef.current = false;
    }
  }, [shouldLog]);

  const logEvent = useCallback((eventType: string, data?: Partial<Omit<LogEvent, "eventType">>) => {
    if (!shouldLog) return;

    const event: LogEvent = {
      eventType,
      timestamp: Date.now(),
      ...data,
    };

    bufferRef.current.push(event);

    // Flush immediately if buffer is full
    if (bufferRef.current.length >= MAX_BUFFER_SIZE) {
      flush();
    } else {
      // Schedule a flush
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      flushTimeoutRef.current = setTimeout(flush, FLUSH_INTERVAL);
    }
  }, [shouldLog, flush]);

  // Flush on unmount or page unload
  useEffect(() => {
    if (!shouldLog) return;

    const handleBeforeUnload = () => {
      if (bufferRef.current.length > 0) {
        // Use sendBeacon for reliable delivery on page unload
        navigator.sendBeacon(
          "/api/player-logs",
          JSON.stringify({
            events: bufferRef.current,
            sessionId: SESSION_ID,
            userAgent: navigator.userAgent,
          })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      // Flush remaining events on cleanup
      flush();
    };
  }, [shouldLog, flush]);

  return { logEvent, flush, sessionId: SESSION_ID };
}
