import { useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

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

const DEVICE_INFO = getDeviceInfo();
const FLUSH_INTERVAL = 3000; // Flush every 3 seconds for faster debugging
const MAX_BUFFER_SIZE = 15; // Flush if buffer exceeds this size

// Generate a unique session ID
const generateSessionId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function usePlayerLogger() {
  const { user } = useAuth();
  const [location] = useLocation();
  const bufferRef = useRef<LogEvent[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFlushingRef = useRef(false);
  const hasLoggedSessionStart = useRef(false);
  const lastLocationRef = useRef<string>("");
  const sessionIdRef = useRef<string>(generateSessionId());
  const prevShouldLogRef = useRef<boolean>(false);

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
          sessionId: sessionIdRef.current,
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

  // Track navigation/route changes
  useEffect(() => {
    if (!shouldLog) return;
    
    // Skip initial mount
    if (lastLocationRef.current === "") {
      lastLocationRef.current = location;
      return;
    }
    
    // Log route change
    if (location !== lastLocationRef.current) {
      logEvent("ROUTE_CHANGE", {
        payload: {
          from: lastLocationRef.current,
          to: location,
          fullUrl: window.location.href,
        },
      });
      lastLocationRef.current = location;
    }
  }, [shouldLog, location, logEvent]);

  // Detect logout transition and seal session + reset state
  useEffect(() => {
    // Detect transition from logged in (shouldLog=true) to logged out (shouldLog=false)
    if (prevShouldLogRef.current && !shouldLog) {
      const currentSessionId = sessionIdRef.current;
      
      // Clear any pending flush timeout to prevent duplicate events
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
        flushTimeoutRef.current = null;
      }
      
      // Add session end event
      bufferRef.current.push({
        eventType: "SESSION_END",
        timestamp: Date.now(),
        payload: { reason: "logout" },
      });
      
      // Send remaining logs (use sendBeacon if available, otherwise fire-and-forget fetch)
      const eventsToSend = [...bufferRef.current];
      bufferRef.current = []; // Clear buffer immediately
      
      if (eventsToSend.length > 0) {
        const logPayload = JSON.stringify({
          events: eventsToSend,
          sessionId: currentSessionId,
          userAgent: navigator.userAgent,
        });
        
        if (typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon("/api/player-logs", logPayload);
        } else {
          // Fallback for non-browser/older environments
          fetch("/api/player-logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: logPayload,
            keepalive: true,
          }).catch(() => {});
        }
      }
      
      // Seal the session
      const sealPayload = JSON.stringify({ sessionId: currentSessionId });
      if (typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon("/api/player-logs/seal", sealPayload);
      } else {
        fetch("/api/player-logs/seal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: sealPayload,
          keepalive: true,
        }).catch(() => {});
      }
      
      // Reset state for next login
      hasLoggedSessionStart.current = false;
      sessionIdRef.current = generateSessionId();
      lastLocationRef.current = "";
      isFlushingRef.current = false;
      console.debug("[PlayerLogger] Session sealed and state reset");
    }
    
    prevShouldLogRef.current = shouldLog;
  }, [shouldLog]);

  // Register session with server and log session start
  useEffect(() => {
    if (!shouldLog || hasLoggedSessionStart.current) return;
    hasLoggedSessionStart.current = true;
    
    // Register new session with server (this clears previous session data)
    const startNewSession = async () => {
      const currentSessionId = sessionIdRef.current;
      try {
        const response = await fetch("/api/player-logs/start-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            sessionId: currentSessionId,
            deviceInfo: DEVICE_INFO,
          }),
        });
        
        if (response.ok) {
          console.debug("[PlayerLogger] Session registered with server:", currentSessionId);
        } else {
          console.debug("[PlayerLogger] Failed to register session:", await response.text());
        }
      } catch (error) {
        console.debug("[PlayerLogger] Failed to register session:", error);
      }
      
      // Log the session start event
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

    // Track all click events (for button presses, links, etc.)
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Find the closest clickable element or element with data-testid
      const clickableTarget = target.closest("button, a, [data-testid], [role='button']") as HTMLElement || target;
      
      logEvent("CLICK", {
        payload: {
          x: e.clientX,
          y: e.clientY,
          targetTag: clickableTarget?.tagName,
          targetId: clickableTarget?.id,
          targetTestId: clickableTarget?.getAttribute("data-testid"),
          targetClass: clickableTarget?.className?.slice?.(0, 100),
          targetText: clickableTarget?.textContent?.slice?.(0, 50),
          targetHref: (clickableTarget as HTMLAnchorElement)?.href?.slice?.(0, 100),
        },
      });
    };

    const handleBeforeUnload = () => {
      const currentSessionId = sessionIdRef.current;
      
      // Log the unload event
      bufferRef.current.push({
        eventType: "SESSION_END",
        timestamp: Date.now(),
        payload: { reason: "page_unload" },
      });
      
      // Send remaining logs via beacon
      if (bufferRef.current.length > 0) {
        navigator.sendBeacon(
          "/api/player-logs",
          JSON.stringify({
            events: bufferRef.current,
            sessionId: currentSessionId,
            userAgent: navigator.userAgent,
          })
        );
      }
      
      // Seal the session via beacon (best effort)
      navigator.sendBeacon(
        "/api/player-logs/seal",
        JSON.stringify({ sessionId: currentSessionId })
      );
    };

    // Add all listeners
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    document.addEventListener("click", handleClick, { capture: true });
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
      document.removeEventListener("click", handleClick, { capture: true });
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

  // Function to seal the current session (call on explicit logout)
  const sealSession = useCallback(async () => {
    if (!shouldLog) return;
    
    const currentSessionId = sessionIdRef.current;
    
    // Log the logout event
    logEvent("SESSION_END", { payload: { reason: "logout" } });
    
    // Flush remaining events
    await flush();
    
    // Seal the session
    try {
      await fetch("/api/player-logs/seal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId: currentSessionId }),
      });
      console.debug("[PlayerLogger] Session sealed:", currentSessionId);
    } catch (error) {
      console.debug("[PlayerLogger] Failed to seal session:", error);
    }
  }, [shouldLog, logEvent, flush]);

  return { logEvent, flush, sealSession, sessionId: sessionIdRef.current, deviceInfo: DEVICE_INFO };
}
