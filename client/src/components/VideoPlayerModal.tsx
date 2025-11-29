import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import ReactPlayer from "react-player";
import type { Video } from "@shared/schema";

interface VideoPlayerModalProps {
  video: Video | null;
  open: boolean;
  onClose: () => void;
}

interface ProgressState {
  played: number;
  playedSeconds: number;
  loaded: number;
  loadedSeconds: number;
}

export function VideoPlayerModal({ video, open, onClose }: VideoPlayerModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [playing, setPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const getVideoUrl = useCallback(() => {
    if (!video) return '';
    return video.objectPath.startsWith('/objects/') 
      ? video.objectPath 
      : `/objects/${video.objectPath}`;
  }, [video]);

  const handlePlayPause = () => setPlaying(!playing);
  
  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setMuted(value[0] === 0);
  };

  const handleToggleMute = () => {
    setMuted(!muted);
  };

  const handleProgress = (state: ProgressState) => {
    if (!seeking) {
      setPlayed(state.played);
    }
  };

  const handleDuration = (dur: number) => {
    setDuration(dur);
  };

  const handleSeekChange = (value: number[]) => {
    setPlayed(value[0]);
  };

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekMouseUp = (value: number[]) => {
    setSeeking(false);
    playerRef.current?.seekTo(value[0]);
  };

  const handleSkipBack = () => {
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    playerRef.current?.seekTo(Math.max(0, currentTime - 10));
  };

  const handleSkipForward = () => {
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    playerRef.current?.seekTo(Math.min(duration, currentTime + 10));
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden bg-black border-none">
        <DialogTitle className="sr-only">{video?.title || 'Video Player'}</DialogTitle>
        <DialogDescription className="sr-only">Video player for {video?.title || 'sermon'}</DialogDescription>
        {video && (
          <div 
            ref={containerRef}
            className="relative group"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onClose}
              data-testid="button-close-video"
            >
              <X className="w-5 h-5" />
            </Button>
            
            <div 
              className="aspect-video bg-black cursor-pointer"
              onClick={handlePlayPause}
            >
              <ReactPlayer
                ref={playerRef}
                url={getVideoUrl()}
                width="100%"
                height="100%"
                playing={playing}
                volume={volume}
                muted={muted}
                playbackRate={playbackRate}
                onProgress={handleProgress}
                onDuration={handleDuration}
                progressInterval={100}
                data-testid="video-player"
              />
            </div>

            <div 
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="mb-3">
                <Slider
                  value={[played]}
                  min={0}
                  max={0.999999}
                  step={0.001}
                  onValueChange={handleSeekChange}
                  onPointerDown={handleSeekMouseDown}
                  onPointerUp={() => handleSeekMouseUp([played])}
                  className="cursor-pointer [&>span:first-child]:h-1.5 [&>span:first-child]:bg-white/30 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-0 [&>span:first-child_span]:bg-primary"
                  data-testid="slider-timeline"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-9 w-9"
                    onClick={handleSkipBack}
                    data-testid="button-skip-back"
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-10 w-10"
                    onClick={handlePlayPause}
                    data-testid="button-play-pause"
                  >
                    {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-9 w-9"
                    onClick={handleSkipForward}
                    data-testid="button-skip-forward"
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>

                  <div className="flex items-center gap-2 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 h-9 w-9"
                      onClick={handleToggleMute}
                      data-testid="button-mute"
                    >
                      {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <Slider
                      value={[muted ? 0 : volume]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={handleVolumeChange}
                      className="w-20 cursor-pointer [&>span:first-child]:h-1 [&>span:first-child]:bg-white/30 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-0 [&>span:first-child_span]:bg-white"
                      data-testid="slider-volume"
                    />
                  </div>

                  <span className="text-white text-sm ml-3 font-mono" data-testid="text-time">
                    {formatTime(played * duration)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 text-sm px-2"
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      data-testid="button-speed"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      {playbackRate}x
                    </Button>
                    {showSpeedMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-zinc-900 rounded-lg border border-zinc-700 py-1 min-w-[80px]">
                        {playbackRates.map((rate) => (
                          <button
                            key={rate}
                            className={`w-full px-3 py-1.5 text-sm text-left hover:bg-white/10 ${
                              playbackRate === rate ? 'text-primary' : 'text-white'
                            }`}
                            onClick={() => handlePlaybackRateChange(rate)}
                            data-testid={`button-speed-${rate}`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-9 w-9"
                    onClick={handleFullscreen}
                    data-testid="button-fullscreen"
                  >
                    <Maximize className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-900 text-white">
              <h2 className="text-2xl font-serif font-bold mb-2" data-testid="text-player-title">
                {video.title}
              </h2>
              <div className="flex gap-4 text-sm text-zinc-400">
                <span data-testid="text-player-date">
                  {new Date(video.recordedDate).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
                {video.duration && <span>Duration: {video.duration}</span>}
                <span>{video.views} views</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
