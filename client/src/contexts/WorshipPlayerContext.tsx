import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { usePlayerLogger } from "@/hooks/usePlayerLogger";

interface WorshipVideo {
  id: number;
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  position: number;
}

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string | HTMLElement, config: {
        height: string;
        width: string;
        videoId: string;
        playerVars?: Record<string, number | string>;
        events?: {
          onReady?: (event: { target: YTPlayer }) => void;
          onStateChange?: (event: { data: number; target: YTPlayer }) => void;
        };
      }) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  loadVideoById: (videoId: string) => void;
  cueVideoById: (videoId: string) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getPlayerState: () => number;
  destroy: () => void;
}

interface WorshipPlayerContextType {
  videos: WorshipVideo[];
  isLoading: boolean;
  currentIndex: number;
  isPlaying: boolean;
  isInitializing: boolean;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  playerReady: boolean;
  currentVideo: WorshipVideo | undefined;
  mainPlayerVisible: boolean;
  miniPlayerDismissed: boolean;
  showMiniPlayer: boolean;
  isIOS: boolean;
  iOSNeedsTap: boolean;
  iOSModalVisible: boolean;
  showiOSModal: () => void;
  hideiOSModal: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  selectTrack: (index: number) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleLoop: () => void;
  setMainPlayerVisible: (visible: boolean) => void;
  dismissMiniPlayer: () => void;
  scrollToMainPlayer: () => void;
  mainPlayerRef: React.RefObject<HTMLDivElement | null>;
}

const WorshipPlayerContext = createContext<WorshipPlayerContextType | null>(null);

export function useWorshipPlayer() {
  const context = useContext(WorshipPlayerContext);
  if (!context) {
    throw new Error("useWorshipPlayer must be used within a WorshipPlayerProvider");
  }
  return context;
}

function PlayerPortal({ 
  mainPlayerVisible, 
  showMiniPlayer,
  mainPlayerRef,
  playerContainerRef,
  currentVideo,
  iOSModalMode = false,
}: { 
  mainPlayerVisible: boolean;
  showMiniPlayer: boolean;
  mainPlayerRef: React.RefObject<HTMLDivElement | null>;
  playerContainerRef: React.RefObject<HTMLDivElement | null>;
  currentVideo: WorshipVideo | undefined;
  iOSModalMode?: boolean;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 96, height: 64 });

  useEffect(() => {
    // Skip position tracking when in iOS modal mode - we use fixed centering instead
    if (iOSModalMode) {
      return;
    }
    
    if (!mainPlayerVisible) {
      setPosition({ top: -9999, left: -9999, width: 0, height: 0 });
      return;
    }

    const updatePosition = () => {
      if (mainPlayerRef.current && mainPlayerVisible) {
        const rect = mainPlayerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top >= -100) {
          setPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          });
        } else {
          setPosition({ top: -9999, left: -9999, width: 0, height: 0 });
        }
      }
    };

    updatePosition();
    
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    const interval = setInterval(updatePosition, 100);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      clearInterval(interval);
    };
  }, [mainPlayerRef, mainPlayerVisible, iOSModalMode]);

  // Always keep the portal mounted to prevent React removeChild errors
  // YouTube takes over the DOM node, so we can't unmount it
  const hasValidMainPosition = mainPlayerVisible && 
    currentVideo &&
    position.width > 50 && 
    position.height > 30 && 
    position.top > 100 && 
    position.left > 50;
  const isMainMode = hasValidMainPosition && !iOSModalMode;
  const isMiniMode = showMiniPlayer && !mainPlayerVisible && currentVideo && !iOSModalMode;
  const shouldHide = !isMainMode && !isMiniMode && !iOSModalMode;

  // Calculate styles based on current mode
  let containerStyle: React.CSSProperties;
  
  if (iOSModalMode && currentVideo) {
    // iOS Modal Mode: Show player centered on screen with fixed positioning
    containerStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(90vw, 500px)',
      aspectRatio: '16/9',
      zIndex: 9999,
      overflow: 'hidden',
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      pointerEvents: 'auto',
      opacity: 1,
    };
  } else {
    // Normal mode: position based on mainPlayerRef or hide
    containerStyle = {
      position: isMiniMode ? 'fixed' : 'absolute',
      top: isMainMode ? position.top : '-9999px',
      left: isMainMode ? position.left : '-9999px',
      transform: 'none',
      bottom: 'auto',
      width: isMainMode ? position.width : '1px',
      height: isMainMode ? position.height : '1px',
      zIndex: isMainMode ? 50 : -1,
      overflow: 'hidden',
      borderRadius: '8px',
      pointerEvents: shouldHide ? 'none' : 'auto',
      opacity: shouldHide ? 0 : 1,
      transition: 'none',
    };
  }

  return createPortal(
    <div
      ref={playerContainerRef}
      data-testid="global-video-player"
      style={containerStyle}
    />,
    document.body
  );
}

export function WorshipPlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { logEvent } = usePlayerLogger();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [mainPlayerVisible, setMainPlayerVisible] = useState(false);
  const [miniPlayerDismissed, setMiniPlayerDismissed] = useState(false);
  const [miniPlayerActivated, setMiniPlayerActivated] = useState(false);
  const [playerCreated, setPlayerCreated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [lastPlayedLoaded, setLastPlayedLoaded] = useState(false);
  const [loopingPreferenceLoaded, setLoopingPreferenceLoaded] = useState(false);
  const [volumePreferenceLoaded, setVolumePreferenceLoaded] = useState(false);
  
  // iOS detection and first-tap tracking
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const [iOSFirstPlayDone, setIOSFirstPlayDone] = useState(false);
  const [iOSModalVisible, setIOSModalVisible] = useState(false);
  
  const playerRef = useRef<YTPlayer | null>(null);
  const isLoopingRef = useRef(isLooping);
  const isPlayingRef = useRef(isPlaying);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const mainPlayerRef = useRef<HTMLDivElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const volumeRef = useRef(volume);
  const autoPlayOnReadyRef = useRef(false);
  const lastBackPressRef = useRef<number>(0);
  const shouldContinuePlayingRef = useRef(false);
  // Pending play callback for iOS - called when player becomes ready after user tap
  const pendingPlayCallbackRef = useRef<(() => void) | null>(null);
  // Debounce timer for rapid track changes
  const trackChangeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  // Target index for debounced track changes
  const targetIndexRef = useRef<number | null>(null);
  // Track the currently loaded video ID in the player (for iOS gesture chain)
  const loadedVideoIdRef = useRef<string | null>(null);

  const { data: videos = [], isLoading } = useQuery<WorshipVideo[]>({
    queryKey: ["worship-videos"],
    queryFn: async () => {
      const response = await fetch("/api/worship-videos");
      if (!response.ok) throw new Error("Failed to fetch worship videos");
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const currentVideo = videos[currentIndex];
  const lastUserIdRef = useRef<string | null>(null);

  // Reset state when user changes (login/logout/different user)
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    const previousUserId = lastUserIdRef.current;
    
    if (previousUserId !== currentUserId) {
      // User changed - stop music for any user change (login or logout)
      // Check if music was playing using ref (not state, as state might be stale)
      const wasPlaying = isPlayingRef.current || miniPlayerActivated;
      
      // Clear all auto-play flags to prevent any auto-play after user change
      autoPlayOnReadyRef.current = false;
      shouldContinuePlayingRef.current = false;
      
      if (wasPlaying || previousUserId !== null || currentUserId !== null) {
        // Stop the YouTube player completely - try multiple methods
        const stopPlayer = () => {
          if (playerRef.current) {
            try {
              const playerState = playerRef.current.getPlayerState?.();
              // Only stop if actually playing (state 1 = playing, 3 = buffering)
              if (playerState === 1 || playerState === 3 || playerState === undefined) {
                playerRef.current.stopVideo();
              }
              playerRef.current.pauseVideo();
            } catch (e) {
              // Player might not be ready
            }
          }
        };
        
        // Try to stop immediately and after a short delay
        stopPlayer();
        setTimeout(stopPlayer, 100);
        setTimeout(stopPlayer, 300);
        
        // Clear progress interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setMiniPlayerDismissed(true);
        setMiniPlayerActivated(false);
        setIsLooping(false);
        setVolumeState(80);
        
        // Only reset to beginning on logout
        if (currentUserId === null) {
          setCurrentIndex(0);
        }
      }
      lastUserIdRef.current = currentUserId;
      setLastPlayedLoaded(false);
      setLoopingPreferenceLoaded(false);
      setVolumePreferenceLoaded(false);
    }
  }, [user?.id, miniPlayerActivated]);

  // Load last played video for logged-in users
  useEffect(() => {
    if (!user || videos.length === 0 || lastPlayedLoaded) return;
    
    const loadLastPlayed = async () => {
      try {
        const response = await fetch("/api/user/last-played", { credentials: "include" });
        if (response.ok) {
          const { videoId } = await response.json();
          if (videoId) {
            const index = videos.findIndex(v => v.youtubeVideoId === videoId);
            if (index !== -1) {
              setCurrentIndex(index);
            }
          }
          setLastPlayedLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load last played video:", error);
      }
    };
    
    loadLastPlayed();
  }, [user, videos, lastPlayedLoaded]);

  // Save last played video when track changes (for logged-in users)
  useEffect(() => {
    if (!user || !currentVideo || !lastPlayedLoaded) return;
    
    const saveLastPlayed = async () => {
      try {
        await fetch("/api/user/last-played", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ videoId: currentVideo.youtubeVideoId }),
        });
      } catch (error) {
        console.error("Failed to save last played video:", error);
      }
    };
    
    saveLastPlayed();
  }, [user, currentVideo?.youtubeVideoId, lastPlayedLoaded]);

  // Load looping preference for logged-in users
  useEffect(() => {
    if (!user || !lastPlayedLoaded || loopingPreferenceLoaded) return;
    
    const loadLoopingPreference = async () => {
      try {
        const response = await fetch("/api/user/looping-preference", { credentials: "include" });
        if (response.ok) {
          const { looping } = await response.json();
          setIsLooping(looping);
        }
        setLoopingPreferenceLoaded(true);
      } catch (error) {
        console.error("Failed to load looping preference:", error);
        setLoopingPreferenceLoaded(true);
      }
    };
    
    loadLoopingPreference();
  }, [user, lastPlayedLoaded, loopingPreferenceLoaded]);

  // Save looping preference when it changes (for logged-in users)
  useEffect(() => {
    // Only save after initial load is complete to avoid overwriting with stale value
    if (!user || !loopingPreferenceLoaded) return;
    
    const saveLoopingPreference = async () => {
      try {
        await fetch("/api/user/looping-preference", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ looping: isLooping }),
        });
      } catch (error) {
        console.error("Failed to save looping preference:", error);
      }
    };
    
    saveLoopingPreference();
  }, [user, isLooping, loopingPreferenceLoaded]);

  // Load volume preference for logged-in users
  useEffect(() => {
    if (!user || !lastPlayedLoaded || volumePreferenceLoaded) return;
    
    const loadVolumePreference = async () => {
      try {
        const response = await fetch("/api/user/volume-preference", { credentials: "include" });
        if (response.ok) {
          const { volume: savedVolume } = await response.json();
          setVolumeState(savedVolume);
          // Also update the player if ready
          if (playerRef.current) {
            try {
              playerRef.current.setVolume(savedVolume);
            } catch (e) {
              // Player might not be ready
            }
          }
        }
        setVolumePreferenceLoaded(true);
      } catch (error) {
        console.error("Failed to load volume preference:", error);
        setVolumePreferenceLoaded(true);
      }
    };
    
    loadVolumePreference();
  }, [user, lastPlayedLoaded, volumePreferenceLoaded]);

  // Save volume preference when it changes (for logged-in users)
  useEffect(() => {
    // Only save after initial load is complete to avoid overwriting with stale value
    if (!user || !volumePreferenceLoaded) return;
    
    const saveVolumePreference = async () => {
      try {
        await fetch("/api/user/volume-preference", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ volume }),
        });
      } catch (error) {
        console.error("Failed to save volume preference:", error);
      }
    };
    
    saveVolumePreference();
  }, [user, volume, volumePreferenceLoaded]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const showMiniPlayer = miniPlayerActivated && !mainPlayerVisible && !miniPlayerDismissed;

  // Load YouTube API immediately on mount (don't wait for videos or user interaction)
  useEffect(() => {
    const loadAPI = () => {
      logEvent("YT_API_LOAD_START", {
        payload: {
          hasYT: !!window.YT,
          hasYTPlayer: !!(window.YT?.Player),
          userAgent: navigator.userAgent,
          isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
          isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        },
      });
      
      if (window.YT && window.YT.Player) {
        logEvent("YT_API_ALREADY_LOADED", { payload: {} });
        setApiLoaded(true);
        return;
      }

      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      logEvent("YT_API_SCRIPT_CHECK", { payload: { existingScript: !!existingScript } });
      
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.onerror = (e) => {
          logEvent("YT_API_SCRIPT_ERROR", { payload: { error: String(e) } });
        };
        tag.onload = () => {
          logEvent("YT_API_SCRIPT_LOADED", { payload: {} });
        };
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        logEvent("YT_API_SCRIPT_INSERTED", { payload: {} });
      }

      window.onYouTubeIframeAPIReady = () => {
        logEvent("YT_API_READY_CALLBACK", { payload: { hasYT: !!window.YT, hasPlayer: !!(window.YT?.Player) } });
        setApiLoaded(true);
      };
    };

    loadAPI();
  }, [logEvent]);
  
  // Pre-create player when videos load and API is ready (don't wait for user tap)
  useEffect(() => {
    if (apiLoaded && videos.length > 0 && !playerCreated) {
      setPlayerCreated(true);
    }
  }, [apiLoaded, videos.length, playerCreated]);

  useEffect(() => {
    if (!apiLoaded || !currentVideo || !playerContainerRef.current) return;
    if (!playerCreated) return;

    if (playerRef.current) return;

    // Log player creation attempt with DOM state
    const container = playerContainerRef.current;
    logEvent("YT_PLAYER_CREATE_START", {
      videoId: currentVideo.youtubeVideoId,
      videoIndex: currentIndex,
      payload: {
        containerExists: !!container,
        containerInDOM: container ? document.body.contains(container) : false,
        containerRect: container ? {
          width: container.offsetWidth,
          height: container.offsetHeight,
          top: container.offsetTop,
          left: container.offsetLeft,
        } : null,
        containerStyle: container ? {
          display: getComputedStyle(container).display,
          visibility: getComputedStyle(container).visibility,
          opacity: getComputedStyle(container).opacity,
          position: getComputedStyle(container).position,
        } : null,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
      },
    });

    // Detect iOS for controls configuration
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    let player: YTPlayer;
    try {
      player = new window.YT.Player(playerContainerRef.current, {
        height: "100%",
        width: "100%",
        videoId: currentVideo.youtubeVideoId,
        playerVars: {
          autoplay: 0,
          // Enable controls on iOS so user can tap directly on the iframe
          // iOS requires direct user gesture on the iframe to start playback
          controls: isIOS ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 0,
          playsinline: 1,
        },
        events: {
          onError: (event: { data: number }) => {
            const errorCodes: Record<number, string> = {
              2: "INVALID_PARAM",
              5: "HTML5_ERROR",
              100: "VIDEO_NOT_FOUND",
              101: "EMBED_NOT_ALLOWED",
              150: "EMBED_NOT_ALLOWED_2",
            };
            logEvent("YT_PLAYER_ERROR", {
              videoId: currentVideo.youtubeVideoId,
              videoIndex: currentIndex,
              payload: {
                errorCode: event.data,
                errorName: errorCodes[event.data] || `UNKNOWN_${event.data}`,
              },
            });
          },
          onReady: (event) => {
            playerRef.current = event.target;
            setPlayerReady(true);
            event.target.setVolume(volumeRef.current);
            // Track the initially loaded video ID
            loadedVideoIdRef.current = currentVideo.youtubeVideoId;
            
            // Get detailed player state for debugging
            let playerState = -99;
            let playerVolume = -1;
            try {
              playerState = event.target.getPlayerState();
              playerVolume = event.target.getVolume();
            } catch (e) {
              logEvent("YT_ON_READY_GET_STATE_ERROR", { payload: { error: String(e) } });
            }
            
            logEvent("YT_ON_READY", {
              videoId: currentVideo.youtubeVideoId,
              videoIndex: currentIndex,
              payload: { 
                hasPendingCallback: !!pendingPlayCallbackRef.current, 
                autoPlayOnReady: autoPlayOnReadyRef.current,
                playerState,
                playerVolume,
                loadedVideoId: loadedVideoIdRef.current,
              },
            });
            
            // Handle pending play callback for iOS - maintains user gesture chain
            if (pendingPlayCallbackRef.current) {
              logEvent("YT_PENDING_CALLBACK_EXEC", { videoId: currentVideo.youtubeVideoId });
              pendingPlayCallbackRef.current();
              pendingPlayCallbackRef.current = null;
            } else if (autoPlayOnReadyRef.current) {
              logEvent("YT_AUTOPLAY_ON_READY", { videoId: currentVideo.youtubeVideoId });
              event.target.playVideo();
              autoPlayOnReadyRef.current = false;
            }
          },
          onStateChange: (event) => {
            const state = event.data;
            const stateNames: Record<number, string> = { [-1]: "UNSTARTED", 0: "ENDED", 1: "PLAYING", 2: "PAUSED", 3: "BUFFERING", 5: "CUED" };
            logEvent("YT_STATE_CHANGE", {
              videoId: currentVideo.youtubeVideoId,
              videoIndex: currentIndex,
              playerState: state,
              payload: { stateName: stateNames[state] || `UNKNOWN_${state}` },
            });
          
          if (state === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            setMiniPlayerActivated(true);
            setIsInitializing(false);
            // Mark iOS first play as done - subsequent programmatic controls will work
            setIOSFirstPlayDone(true);
            
            const dur = event.target.getDuration();
            if (dur) setDuration(dur);
            
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
            }
            progressIntervalRef.current = setInterval(() => {
              if (playerRef.current) {
                try {
                  const time = playerRef.current.getCurrentTime();
                  setCurrentTime(time);
                } catch {
                }
              }
            }, 500);
          } else if (state === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
          } else if (state === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            if (isLoopingRef.current) {
              event.target.seekTo(0, true);
              event.target.playVideo();
            } else if (currentIndex < videos.length - 1) {
              // Mark that we should continue playing when track changes
              shouldContinuePlayingRef.current = true;
              setCurrentIndex((prev) => prev + 1);
            }
          }
        },
      },
      });
      
      logEvent("YT_PLAYER_CREATE_SUCCESS", {
        videoId: currentVideo.youtubeVideoId,
        payload: { playerCreated: !!player },
      });
    } catch (error) {
      logEvent("YT_PLAYER_CREATE_ERROR", {
        videoId: currentVideo.youtubeVideoId,
        payload: { error: String(error) },
      });
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [apiLoaded, currentVideo, videos.length, currentIndex, playerCreated, logEvent]);

  // Track the previous index to detect track changes
  const prevIndexRef = useRef(currentIndex);
  // Track if player has been initialized (to avoid loadVideoById on first load)
  const playerInitializedRef = useRef(false);
  // Track if we captured shouldAutoPlay before debounce
  const pendingAutoPlayRef = useRef(false);
  
  useEffect(() => {
    if (!playerRef.current || !currentVideo || !playerReady) return;
    
    const isTrackChange = prevIndexRef.current !== currentIndex;
    
    // Skip on initial mount - player was already created with this video
    if (!playerInitializedRef.current) {
      playerInitializedRef.current = true;
      prevIndexRef.current = currentIndex;
      return;
    }
    
    // If this is a track change, capture autoplay intent NOW before any debounce
    // This preserves the playing state even during rapid skips
    if (isTrackChange) {
      if (shouldContinuePlayingRef.current || isPlayingRef.current) {
        pendingAutoPlayRef.current = true;
      }
    }
    
    // Cancel any pending debounced track change
    if (trackChangeDebounceRef.current) {
      clearTimeout(trackChangeDebounceRef.current);
    }
    
    // Debounce rapid track changes - wait 150ms before executing
    trackChangeDebounceRef.current = setTimeout(() => {
      if (!playerRef.current || !currentVideo) return;
      
      prevIndexRef.current = currentIndex;
      
      // Use the captured autoplay intent
      const shouldAutoPlay = pendingAutoPlayRef.current;
      pendingAutoPlayRef.current = false;
      shouldContinuePlayingRef.current = false;
      
      setCurrentTime(0);
      setDuration(0);
      
      if (shouldAutoPlay) {
        // Use loadVideoById which auto-plays - update loadedVideoIdRef since video is actually loaded
        logEvent("LOAD_VIDEO_BY_ID", { videoId: currentVideo.youtubeVideoId, videoIndex: currentIndex, payload: { autoPlay: true } });
        playerRef.current.loadVideoById(currentVideo.youtubeVideoId);
        loadedVideoIdRef.current = currentVideo.youtubeVideoId;
      } else {
        // Use cueVideoById which does NOT auto-play
        // IMPORTANT: Do NOT update loadedVideoIdRef here - video is only cued, not loaded
        // This allows play() to detect that it needs to use loadVideoById for iOS gesture chain
        logEvent("CUE_VIDEO_BY_ID", { videoId: currentVideo.youtubeVideoId, videoIndex: currentIndex, payload: { autoPlay: false, loadedVideoIdStays: loadedVideoIdRef.current } });
        playerRef.current.cueVideoById(currentVideo.youtubeVideoId);
        // loadedVideoIdRef.current stays unchanged - will be updated when play() calls loadVideoById
      }
    }, 150);
    
    return () => {
      if (trackChangeDebounceRef.current) {
        clearTimeout(trackChangeDebounceRef.current);
      }
    };
  }, [currentIndex, currentVideo, playerReady]);

  const play = useCallback(() => {
    const videoId = videos[currentIndex]?.youtubeVideoId;
    const loadedVideoId = loadedVideoIdRef.current;
    const needsVideoChange = videoId && videoId !== loadedVideoId;
    
    logEvent("PLAY_CALLED", {
      videoId,
      videoIndex: currentIndex,
      payload: { 
        playerCreated, 
        playerReady, 
        hasPlayerRef: !!playerRef.current, 
        loadedVideoId, 
        needsVideoChange,
        isIOS,
      },
    });
    
    // iOS FIX: Call playVideo() SYNCHRONOUSLY before any React state updates
    // iOS Safari requires the play call to happen in the same synchronous call stack as the user tap
    // Any async operations (setState, setTimeout) break the gesture chain
    let playedSynchronously = false;
    
    if (playerRef.current && playerReady) {
      try {
        const currentVideoId = videos[currentIndex]?.youtubeVideoId;
        const currentlyLoadedId = loadedVideoIdRef.current;
        
        if (currentVideoId && currentVideoId !== currentlyLoadedId) {
          logEvent("SYNC_LOAD_VIDEO_BY_ID", { 
            videoId: currentVideoId, 
            videoIndex: currentIndex,
            payload: { previousLoadedId: currentlyLoadedId, isIOS },
          });
          playerRef.current.loadVideoById(currentVideoId);
          loadedVideoIdRef.current = currentVideoId;
        } else {
          logEvent("SYNC_PLAY_VIDEO", { videoId: currentVideoId, videoIndex: currentIndex, payload: { isIOS } });
          playerRef.current.playVideo();
        }
        playedSynchronously = true;
      } catch (e) {
        logEvent("SYNC_PLAY_ERROR", { videoId, videoIndex: currentIndex, payload: { error: String(e) } });
        console.error("Error playing synchronously:", e);
      }
    }
    
    // Now do state updates AFTER the synchronous play call
    setMiniPlayerDismissed(false);
    setIsInitializing(true);
    
    // Reset initializing state after timeout in case playback fails
    const initTimeoutId = setTimeout(() => {
      logEvent("PLAY_TIMEOUT", { videoId, videoIndex: currentIndex, payload: { reason: "5s timeout reached" } });
      setIsInitializing(false);
    }, 5000);
    
    // If we already played synchronously, we're done - just clear the timeout when state changes
    if (playedSynchronously) {
      logEvent("PLAY_SYNC_SUCCESS", { videoId, videoIndex: currentIndex });
      // isInitializing will be cleared by onStateChange when PLAYING fires
      return;
    }
    
    // Define the play action for deferred execution (when player isn't ready yet)
    const executePlay = () => {
      if (playerRef.current) {
        try {
          const currentVideoId = videos[currentIndex]?.youtubeVideoId;
          const currentlyLoadedId = loadedVideoIdRef.current;
          
          if (currentVideoId && currentVideoId !== currentlyLoadedId) {
            logEvent("DEFERRED_LOAD_VIDEO_BY_ID", { 
              videoId: currentVideoId, 
              videoIndex: currentIndex,
              payload: { previousLoadedId: currentlyLoadedId },
            });
            playerRef.current.loadVideoById(currentVideoId);
            loadedVideoIdRef.current = currentVideoId;
          } else {
            logEvent("DEFERRED_PLAY_VIDEO", { videoId: currentVideoId, videoIndex: currentIndex });
            playerRef.current.playVideo();
          }
        } catch (e) {
          logEvent("DEFERRED_PLAY_ERROR", { videoId, videoIndex: currentIndex, payload: { error: String(e) } });
          console.error("Error playing:", e);
        }
      } else {
        logEvent("PLAY_NO_PLAYER_REF", { videoId, videoIndex: currentIndex });
      }
    };
    
    if (!playerCreated) {
      // Player not created yet - create it and queue play for when ready
      logEvent("PLAY_CREATE_PLAYER", { videoId, videoIndex: currentIndex });
      setPlayerCreated(true);
      pendingPlayCallbackRef.current = executePlay;
      autoPlayOnReadyRef.current = true;
      return;
    }
    
    // Player exists but not ready - queue for when ready
    logEvent("PLAY_QUEUE_PENDING", { videoId, videoIndex: currentIndex, payload: { playerExists: !!playerRef.current, playerReady } });
    pendingPlayCallbackRef.current = executePlay;
    autoPlayOnReadyRef.current = true;
  }, [playerCreated, playerReady, currentIndex, videos, logEvent, isIOS]);

  const pause = useCallback(() => {
    logEvent("PAUSE_CALLED", { videoId: videos[currentIndex]?.youtubeVideoId, videoIndex: currentIndex });
    // Clear any pending auto-play to prevent pause from being overridden
    autoPlayOnReadyRef.current = false;
    shouldContinuePlayingRef.current = false;
    pendingPlayCallbackRef.current = null;
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {
        logEvent("PAUSE_ERROR", { videoIndex: currentIndex, payload: { error: String(e) } });
        console.error("Error pausing:", e);
      }
    }
  }, [currentIndex, videos, logEvent]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    const newIndex = currentIndex < videos.length - 1 ? currentIndex + 1 : 0;
    logEvent("NEXT_CALLED", {
      videoId: videos[newIndex]?.youtubeVideoId,
      videoIndex: newIndex,
      payload: { fromIndex: currentIndex, isPlaying: isPlayingRef.current },
    });
    
    // Mark that we should continue playing if currently playing
    if (isPlayingRef.current) {
      shouldContinuePlayingRef.current = true;
    }
    
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (videos.length > 0) {
      // At end of playlist, wrap to beginning
      setCurrentIndex(0);
    }
  }, [currentIndex, videos.length, videos, logEvent]);

  const previous = useCallback(() => {
    const now = Date.now();
    const timeSinceLastPress = now - lastBackPressRef.current;
    
    // If within first 3 seconds of song OR double-tapped within 3 seconds, go to previous track
    if (currentTime < 3 || timeSinceLastPress < 3000) {
      // Mark that we should continue playing if currently playing
      if (isPlayingRef.current) {
        shouldContinuePlayingRef.current = true;
      }
      
      if (currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else if (videos.length > 0) {
        // At beginning of playlist, wrap to end
        setCurrentIndex(videos.length - 1);
      }
      lastBackPressRef.current = 0; // Reset so next press restarts song
    } else {
      // Otherwise restart the current song
      if (playerRef.current) {
        try {
          playerRef.current.seekTo(0, true);
          setCurrentTime(0);
        } catch (e) {
          console.error("Error seeking to start:", e);
        }
      }
      lastBackPressRef.current = now; // Record this press
    }
  }, [currentIndex, currentTime, videos.length]);

  const selectTrack = useCallback((index: number) => {
    if (index >= 0 && index < videos.length) {
      logEvent("SELECT_TRACK", {
        videoId: videos[index]?.youtubeVideoId,
        videoIndex: index,
        payload: { fromIndex: currentIndex },
      });
      setCurrentIndex(index);
    }
  }, [videos.length, videos, currentIndex, logEvent]);

  const seek = useCallback((time: number) => {
    if (playerRef.current) {
      try {
        playerRef.current.seekTo(time, true);
        setCurrentTime(time);
      } catch (e) {
        console.error("Error seeking:", e);
      }
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (playerRef.current) {
      try {
        playerRef.current.setVolume(newVolume);
      } catch (e) {
        console.error("Error setting volume:", e);
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (playerRef.current) {
      try {
        if (isMuted) {
          playerRef.current.unMute();
          setIsMuted(false);
        } else {
          playerRef.current.mute();
          setIsMuted(true);
        }
      } catch (e) {
        console.error("Error toggling mute:", e);
      }
    }
  }, [isMuted]);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const dismissMiniPlayer = useCallback(() => {
    setMiniPlayerDismissed(true);
    setMiniPlayerActivated(false);
    setIsInitializing(false);
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {
        console.error("Error pausing on dismiss:", e);
      }
    }
  }, []);

  // Scroll to the main player section (for iOS first-tap requirement)
  const scrollToMainPlayer = useCallback(() => {
    logEvent("SCROLL_TO_MAIN_PLAYER", { payload: { isIOS, iOSFirstPlayDone } });
    // Find the worship-music section and scroll to it
    const section = document.getElementById("worship-music");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [logEvent, isIOS, iOSFirstPlayDone]);

  // iOS needs a direct tap on the player if first play hasn't been done yet
  const iOSNeedsTap = isIOS && !iOSFirstPlayDone;

  // iOS modal functions
  const showiOSModal = useCallback(() => {
    logEvent("IOS_MODAL_SHOW", { payload: { isIOS, iOSFirstPlayDone } });
    setIOSModalVisible(true);
    // Make sure the player is created so it appears in the modal
    if (!playerCreated) {
      setPlayerCreated(true);
    }
  }, [logEvent, isIOS, iOSFirstPlayDone, playerCreated]);

  const hideiOSModal = useCallback(() => {
    logEvent("IOS_MODAL_HIDE", { payload: { isIOS, iOSFirstPlayDone } });
    setIOSModalVisible(false);
  }, [logEvent, isIOS, iOSFirstPlayDone]);

  // Auto-close iOS modal when playback starts
  useEffect(() => {
    if (isPlaying && iOSModalVisible) {
      logEvent("IOS_MODAL_AUTO_CLOSE", { payload: { reason: "playback_started" } });
      setIOSModalVisible(false);
    }
  }, [isPlaying, iOSModalVisible, logEvent]);

  const value: WorshipPlayerContextType = {
    videos,
    isLoading,
    currentIndex,
    isPlaying,
    isInitializing,
    volume,
    isMuted,
    isLooping,
    currentTime,
    duration,
    playerReady,
    currentVideo,
    mainPlayerVisible,
    miniPlayerDismissed,
    showMiniPlayer,
    isIOS,
    iOSNeedsTap,
    iOSModalVisible,
    showiOSModal,
    hideiOSModal,
    play,
    pause,
    togglePlay,
    next,
    previous,
    selectTrack,
    seek,
    setVolume,
    toggleMute,
    toggleLoop,
    setMainPlayerVisible,
    dismissMiniPlayer,
    scrollToMainPlayer,
    mainPlayerRef,
  };

  return (
    <WorshipPlayerContext.Provider value={value}>
      {children}
      {/* iOS Modal backdrop - shows behind the centered player */}
      {iOSModalVisible && currentVideo && createPortal(
        <div 
          className="fixed inset-0 z-[9998] bg-black/90"
          onClick={hideiOSModal}
        >
          {/* Header and info overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div>
              <h3 className="text-white font-semibold text-lg">Worship Music</h3>
              <p className="text-white/60 text-sm">Tap the video to play</p>
            </div>
            <button 
              onClick={hideiOSModal}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20"
              aria-label="Close"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Track info at bottom */}
          <div className="absolute bottom-8 left-4 right-4 text-center">
            <p className="text-white font-medium">{currentVideo.title}</p>
            <p className="text-white/50 text-sm mt-1">Tap the play button, then close this</p>
          </div>
        </div>,
        document.body
      )}
      {/* PlayerPortal - always mounted, shows centered when iOS modal is active */}
      {playerCreated && (
        <PlayerPortal
          mainPlayerVisible={mainPlayerVisible}
          showMiniPlayer={showMiniPlayer}
          mainPlayerRef={mainPlayerRef}
          playerContainerRef={playerContainerRef}
          currentVideo={currentVideo}
          iOSModalMode={iOSModalVisible}
        />
      )}
    </WorshipPlayerContext.Provider>
  );
}
