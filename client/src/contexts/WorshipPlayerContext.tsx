import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";

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
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  playerReady: boolean;
  currentVideo: WorshipVideo | undefined;
  mainPlayerVisible: boolean;
  miniPlayerDismissed: boolean;
  showMiniPlayer: boolean;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  selectTrack: (index: number) => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setMainPlayerVisible: (visible: boolean) => void;
  dismissMiniPlayer: () => void;
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
}: { 
  mainPlayerVisible: boolean;
  showMiniPlayer: boolean;
  mainPlayerRef: React.RefObject<HTMLDivElement | null>;
  playerContainerRef: React.RefObject<HTMLDivElement | null>;
  currentVideo: WorshipVideo | undefined;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 96, height: 64 });

  useEffect(() => {
    const updatePosition = () => {
      if (mainPlayerRef.current) {
        const rect = mainPlayerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setPosition({
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          });
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
  }, [mainPlayerRef, mainPlayerVisible]);

  if (!currentVideo) return null;

  const isMainMode = mainPlayerVisible && position.width > 0;
  const isMiniMode = showMiniPlayer && !mainPlayerVisible;
  const isHidden = !isMainMode && !isMiniMode;

  return createPortal(
    <div
      ref={playerContainerRef}
      data-testid="global-video-player"
      style={{
        position: isMainMode ? 'absolute' : 'fixed',
        top: isMainMode ? position.top : (isMiniMode ? 'auto' : '-9999px'),
        left: isMainMode ? position.left : (isMiniMode ? '-9999px' : '-9999px'),
        bottom: isMiniMode ? '0' : 'auto',
        width: isMainMode ? position.width : (isMiniMode ? '64px' : '1px'),
        height: isMainMode ? position.height : (isMiniMode ? '48px' : '1px'),
        zIndex: isMainMode ? 50 : (isMiniMode ? 60 : -1),
        overflow: 'hidden',
        borderRadius: isMainMode ? '8px' : '4px',
        pointerEvents: isHidden ? 'none' : 'auto',
        opacity: isHidden ? 0 : 1,
        transition: 'none',
      }}
    />,
    document.body
  );
}

export function WorshipPlayerProvider({ children }: { children: ReactNode }) {
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
  
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const mainPlayerRef = useRef<HTMLDivElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const volumeRef = useRef(volume);
  const autoPlayOnReadyRef = useRef(false);
  const userInitiatedPlayRef = useRef(false);

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

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const showMiniPlayer = miniPlayerActivated && !mainPlayerVisible && !miniPlayerDismissed;

  useEffect(() => {
    if (videos.length === 0) return;

    const loadAPI = () => {
      if (window.YT && window.YT.Player) {
        setApiLoaded(true);
        return;
      }

      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      window.onYouTubeIframeAPIReady = () => {
        setApiLoaded(true);
      };
    };

    loadAPI();
  }, [videos.length]);

  useEffect(() => {
    if (!apiLoaded || !currentVideo || !playerContainerRef.current) return;

    if (playerRef.current) return;

    const player = new window.YT.Player(playerContainerRef.current, {
      height: "100%",
      width: "100%",
      videoId: currentVideo.youtubeVideoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        fs: 0,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          playerRef.current = event.target;
          setPlayerReady(true);
          event.target.setVolume(volumeRef.current);
          
          if (autoPlayOnReadyRef.current) {
            event.target.playVideo();
            autoPlayOnReadyRef.current = false;
          }
        },
        onStateChange: (event) => {
          const state = event.data;
          if (state === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            if (userInitiatedPlayRef.current) {
              setMiniPlayerActivated(true);
            }
            
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
            if (currentIndex < videos.length - 1) {
              setCurrentIndex((prev) => prev + 1);
            }
          }
        },
      },
    });

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [apiLoaded, currentVideo, videos.length, currentIndex]);

  useEffect(() => {
    if (playerRef.current && currentVideo && playerReady) {
      playerRef.current.loadVideoById(currentVideo.youtubeVideoId);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentIndex, currentVideo, playerReady]);

  const play = useCallback(() => {
    userInitiatedPlayRef.current = true;
    setMiniPlayerDismissed(false);
    if (playerRef.current) {
      try {
        playerRef.current.playVideo();
      } catch (e) {
        console.error("Error playing:", e);
      }
    } else {
      autoPlayOnReadyRef.current = true;
    }
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {
        console.error("Error pausing:", e);
      }
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, videos.length]);

  const previous = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const selectTrack = useCallback((index: number) => {
    if (index >= 0 && index < videos.length) {
      setCurrentIndex(index);
    }
  }, [videos.length]);

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

  const dismissMiniPlayer = useCallback(() => {
    setMiniPlayerDismissed(true);
    setMiniPlayerActivated(false);
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {
        console.error("Error pausing on dismiss:", e);
      }
    }
  }, []);

  const value: WorshipPlayerContextType = {
    videos,
    isLoading,
    currentIndex,
    isPlaying,
    volume,
    isMuted,
    currentTime,
    duration,
    playerReady,
    currentVideo,
    mainPlayerVisible,
    miniPlayerDismissed,
    showMiniPlayer,
    play,
    pause,
    togglePlay,
    next,
    previous,
    selectTrack,
    seek,
    setVolume,
    toggleMute,
    setMainPlayerVisible,
    dismissMiniPlayer,
    mainPlayerRef,
  };

  return (
    <WorshipPlayerContext.Provider value={value}>
      {children}
      <PlayerPortal
        mainPlayerVisible={mainPlayerVisible}
        showMiniPlayer={showMiniPlayer}
        mainPlayerRef={mainPlayerRef}
        playerContainerRef={playerContainerRef}
        currentVideo={currentVideo}
      />
    </WorshipPlayerContext.Provider>
  );
}
