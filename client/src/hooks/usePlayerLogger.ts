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

// Capture device/browser info once at startup
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua);
  const isMobile = /Mobile/.test(ua);
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  return {
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isMobile,
    screenWidth,
    screenHeight,
    viewportWidth,
    viewportHeight,
    platform: navigator.platform,
  };
};

const SESSION_ID = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
const DEVICE_INFO = getDeviceInfo();
const FLUSH_INTERVAL = 3000; // Flush every 3 seconds for faster debugging
const MAX_BUFFER_SIZE = 15; // Flush if buffer exceeds this size

export function usePlayerLogger() {
  const { user } = useAuth();
  const bufferRef = useRef<LogEvent[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFlushingRef = useRef(false);
  const hasLoggedSessionStart = useRef(false);

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

  // Clear previous logs and log session start with device info (fresh recording session)
  useEffect(() => {
    if (!shouldLog || hasLoggedSessionStart.current) return;
    hasLoggedSessionStart.current = true;
    
    // Clear all previous logs for a fresh recording session
    const startNewSession = async () => {
      try {
        await fetch("/api/player-logs", {
          method: "DELETE",
          credentials: "include",
        });
        console.debug("[PlayerLogger] Cleared previous session logs");
      } catch (error) {
        console.debug("[PlayerLogger] Failed to clear previous logs:", error);
      }
      
      // Now log the session start
      logEvent("SESSION_START", {
        payload: {
          ...DEVICE_INFO,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      });
    };
    
    startNewSession();
  }, [shouldLog, logEvent]);

  // Global event listeners for comprehensive tracking
  useEffect(() => {
    if (!shouldLog) return;

    // Track page visibility changes (user switching tabs, locking phone)
    const handleVisibilityChange = () => {
      logEvent("PAGE_VISIBILITY_CHANGE", {
        payload: {
          visibilityState: document.visibilityState,
          hidden: document.hidden,
        },
      });
    };

    // Track touch events on the document (for iOS gesture debugging)
    let lastTouchTime = 0;
    const handleTouchStart = (e: TouchEvent) => {
      const now = Date.now();
      // Throttle to avoid too many events
      if (now - lastTouchTime < 100) return;
      lastTouchTime = now;
      
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      logEvent("TOUCH_START", {
        payload: {
          x: touch?.clientX,
          y: touch?.clientY,
          targetTag: target?.tagName,
          targetId: target?.id,
          targetTestId: target?.getAttribute("data-testid"),
          targetClass: target?.className?.slice?.(0, 100),
        },
      });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      logEvent("TOUCH_END", {
        payload: {
          targetTag: target?.tagName,
          targetId: target?.id,
          targetTestId: target?.getAttribute("data-testid"),
        },
      });
    };

    // Track scroll events (throttled)
    let lastScrollTime = 0;
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime < 500) return; // Throttle to 500ms
      lastScrollTime = now;
      
      logEvent("PAGE_SCROLL", {
        payload: {
          scrollY: window.scrollY,
          scrollX: window.scrollX,
          viewportHeight: window.innerHeight,
          documentHeight: document.documentElement.scrollHeight,
        },
      });
    };

    // Track errors
    const handleError = (e: ErrorEvent) => {
      logEvent("JS_ERROR", {
        payload: {
          message: e.message,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
        },
      });
    };

    // Track unhandled promise rejections
    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      logEvent("UNHANDLED_REJECTION", {
        payload: {
          reason: String(e.reason),
        },
      });
    };

    // Track focus/blur (app going background on mobile)
    const handleFocus = () => {
      logEvent("WINDOW_FOCUS", { payload: {} });
    };

    const handleBlur = () => {
      logEvent("WINDOW_BLUR", { payload: {} });
    };

    const handleBeforeUnload = () => {
      logEvent("PAGE_UNLOAD", { payload: {} });
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

    // Add all listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      // Flush remaining events on cleanup
      flush();
    };
  }, [shouldLog, logEvent, flush]);

  return { logEvent, flush, sessionId: SESSION_ID, deviceInfo: DEVICE_INFO };
}
