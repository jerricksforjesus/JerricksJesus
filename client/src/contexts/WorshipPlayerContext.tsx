import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from "react";
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
  registerMainHost: (element: HTMLDivElement | null) => void;
  registerMiniHost: (element: HTMLDivElement | null) => void;
}

const WorshipPlayerContext = createContext<WorshipPlayerContextType | null>(null);

export function useWorshipPlayer() {
  const context = useContext(WorshipPlayerContext);
  if (!context) {
    throw new Error("useWorshipPlayer must be used within a WorshipPlayerProvider");
  }
  return context;
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
  const playerWrapperRef = useRef<HTMLDivElement | null>(null);
  const mainHostRef = useRef<HTMLDivElement | null>(null);
  const miniHostRef = useRef<HTMLDivElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const volumeRef = useRef(volume);
  const autoPlayOnReadyRef = useRef(false);

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

  const syncPlayerHost = useCallback((forceMainVisible?: boolean, forceShowMini?: boolean) => {
    const wrapper = playerWrapperRef.current;
    if (!wrapper) return;

    const isMainVisible = forceMainVisible ?? mainPlayerVisible;
    const shouldShowMini = forceShowMini ?? showMiniPlayer;

    const targetHost = isMainVisible 
      ? mainHostRef.current 
      : (shouldShowMini ? miniHostRef.current : null);
    
    if (targetHost && wrapper.parentElement !== targetHost) {
      targetHost.appendChild(wrapper);
    }
  }, [mainPlayerVisible, showMiniPlayer]);

  const registerMainHost = useCallback((element: HTMLDivElement | null) => {
    mainHostRef.current = element;
    if (element) {
      syncPlayerHost(true, false);
    }
  }, [syncPlayerHost]);

  const registerMiniHost = useCallback((element: HTMLDivElement | null) => {
    miniHostRef.current = element;
    if (element && showMiniPlayer) {
      syncPlayerHost(false, true);
    }
  }, [syncPlayerHost, showMiniPlayer]);

  useEffect(() => {
    syncPlayerHost();
  }, [syncPlayerHost]);

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
    if (!apiLoaded || !currentVideo) return;

    if (!playerWrapperRef.current) {
      const wrapper = document.createElement('div');
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      wrapper.setAttribute('data-testid', 'global-video-player');
      playerWrapperRef.current = wrapper;
    }

    const createPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      const wrapper = playerWrapperRef.current;
      if (!wrapper) return;

      while (wrapper.firstChild) {
        wrapper.removeChild(wrapper.firstChild);
      }

      const playerDiv = document.createElement('div');
      playerDiv.id = 'worship-player-iframe';
      playerDiv.style.width = '100%';
      playerDiv.style.height = '100%';
      wrapper.appendChild(playerDiv);

      playerRef.current = new window.YT.Player(playerDiv, {
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
            setPlayerReady(true);
            event.target.setVolume(volumeRef.current);
            if (autoPlayOnReadyRef.current) {
              event.target.playVideo();
              autoPlayOnReadyRef.current = false;
            }
            setDuration(event.target.getDuration());
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setMiniPlayerActivated(true);
              setMiniPlayerDismissed(false);
              startProgressTracking();
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              stopProgressTracking();
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              stopProgressTracking();
              setCurrentIndex(prev => (prev < videos.length - 1) ? prev + 1 : 0);
              autoPlayOnReadyRef.current = true;
            }
          },
        },
      });
    };

    createPlayer();

    return () => {
      stopProgressTracking();
    };
  }, [apiLoaded, currentIndex, currentVideo?.youtubeVideoId, videos.length]);

  useEffect(() => {
    return () => {
      stopProgressTracking();
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  const startProgressTracking = () => {
    stopProgressTracking();
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current) {
        try {
          setCurrentTime(playerRef.current.getCurrentTime());
          setDuration(playerRef.current.getDuration());
        } catch {
          stopProgressTracking();
        }
      }
    }, 1000);
  };

  const stopProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const play = useCallback(() => {
    if (!playerRef.current) return;
    try {
      playerRef.current.playVideo();
    } catch (e) {
      console.error("Error playing:", e);
    }
  }, []);

  const pause = useCallback(() => {
    if (!playerRef.current) return;
    try {
      playerRef.current.pauseVideo();
    } catch (e) {
      console.error("Error pausing:", e);
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
    autoPlayOnReadyRef.current = isPlaying;
    setIsPlaying(false);
    setCurrentIndex(prev => (prev < videos.length - 1) ? prev + 1 : 0);
    setCurrentTime(0);
    setPlayerReady(false);
    stopProgressTracking();
  }, [isPlaying, videos.length]);

  const previous = useCallback(() => {
    autoPlayOnReadyRef.current = isPlaying;
    setIsPlaying(false);
    setCurrentIndex(prev => (prev > 0) ? prev - 1 : videos.length - 1);
    setCurrentTime(0);
    setPlayerReady(false);
    stopProgressTracking();
  }, [isPlaying, videos.length]);

  const selectTrack = useCallback((index: number) => {
    autoPlayOnReadyRef.current = isPlaying;
    setIsPlaying(false);
    setCurrentIndex(index);
    setCurrentTime(0);
    setPlayerReady(false);
    stopProgressTracking();
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    setCurrentTime(time);
    if (playerRef.current) {
      try {
        playerRef.current.seekTo(time, true);
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
        if (newVolume === 0) {
          setIsMuted(true);
        } else if (isMuted) {
          setIsMuted(false);
          playerRef.current.unMute();
        }
      } catch (e) {
        console.error("Error changing volume:", e);
      }
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume);
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (e) {
      console.error("Error toggling mute:", e);
    }
  }, [isMuted, volume]);

  const dismissMiniPlayer = useCallback(() => {
    pause();
    setMiniPlayerDismissed(true);
    setMiniPlayerActivated(false);
  }, [pause]);

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
    registerMainHost,
    registerMiniHost,
  };

  return (
    <WorshipPlayerContext.Provider value={value}>
      {children}
    </WorshipPlayerContext.Provider>
  );
}
