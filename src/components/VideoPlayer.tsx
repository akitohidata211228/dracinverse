import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  Lock,
  Loader2,
  AlertCircle,
  RefreshCw,
  Heart,
  Share2,
  Check,
  ListFilter,
  ChevronDown,
  BookOpen,
  X,
  ArrowLeft
} from 'lucide-react';

interface VideoPlayerProps {
  streamUrl: string | null;
  directUrl?: string | null;
  /** True while the parent is still fetching the stream data for this episode. */
  streamLoading?: boolean;
  /** Optional server-provided reason to show in the error overlay. */
  errorMessage?: string | null;
  title: string;
  source?: 'flickreels' | 'melolo';
  episodeNumber: number;
  totalEpisodes: number;
  isLocked?: boolean;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  autoNext?: boolean;
  onAutoNextToggle?: (val: boolean) => void;
  // Overlay props for Like, Episode, Tabs & Close
  onClose?: () => void;
  isFavorited?: boolean;
  onFavoriteToggle?: () => void;
  onShare?: () => void;
  onOpenEpisodeDrawer?: () => void;
  onSelectTab?: (tab: 'video' | 'novel' | 'info') => void;
  activeTab?: 'video' | 'novel' | 'info';
  copiedShare?: boolean;
}

// Accurately detect if stream is HLS (M3U8) even if wrapped inside proxy URL
function checkIsM3u8(url: string | null): boolean {
  if (!url) return false;
  let decoded = url;
  if (url.includes('/api/stream/proxy?url=')) {
    try {
      decoded = decodeURIComponent(url.split('/api/stream/proxy?url=')[1] || '');
    } catch {}
  }
  return decoded.toLowerCase().includes('.m3u8');
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamUrl,
  directUrl,
  streamLoading = false,
  errorMessage = null,
  title,
  source = 'flickreels',
  episodeNumber,
  totalEpisodes,
  isLocked,
  onNextEpisode,
  onPrevEpisode,
  autoNext = true,
  onAutoNextToggle,
  onClose,
  isFavorited = false,
  onFavoriteToggle,
  onShare,
  onOpenEpisodeDrawer,
  onSelectTab,
  copiedShare = false
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isAutoplayMuted, setIsAutoplayMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [aspectMode, setAspectMode] = useState<'contain' | 'cover'>('contain');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [activeStreamIndex, setActiveStreamIndex] = useState<number>(0);
  const [reloadNonce, setReloadNonce] = useState<number>(0);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'left' | 'right' | null>(null);
  const [centerPlayIconState, setCenterPlayIconState] = useState<'play' | 'pause' | null>(null);

  const controlsTimeoutRef = useRef<any>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const singleTapTimerRef = useRef<any>(null);
  const autoNextTimerRef = useRef<any>(null);

  const speeds = [0.75, 1, 1.25, 1.5, 2];

  // Clear auto next timer helper
  const clearAutoNextTimer = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearInterval(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    setAutoNextCountdown(null);
  }, []);

  // Candidates for streaming URLs to try in priority order.
  // Only URLs that belong to the requested episode may be used here: no demo/placeholder
  // manifests, otherwise a failed load would silently play an unrelated video.
  const streamCandidates = React.useMemo(() => {
    const list: string[] = [];
    if (streamUrl) list.push(streamUrl);
    // Raw CDN URLs are only a fallback when the server did not proxy them.
    if (directUrl && directUrl !== streamUrl && directUrl.startsWith('/api/stream/proxy')) {
      list.push(directUrl);
    }
    return list;
  }, [streamUrl, directUrl]);

  useEffect(() => {
    setActiveStreamIndex(0);
    clearAutoNextTimer();
  }, [streamUrl, directUrl, clearAutoNextTimer]);

  const currentPlayableUrl = streamCandidates[activeStreamIndex] || streamCandidates[0] || null;

  // Auto-fullscreen on mobile when component mounts or plays
  const requestMobileFullscreen = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      if (containerRef.current && !document.fullscreenElement && containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    }
  }, []);

  // Safe play helper handling browser autoplay policy
  const safePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    requestMobileFullscreen();

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          if (err.name === 'NotAllowedError') {
            video.muted = true;
            setIsMuted(true);
            setIsAutoplayMuted(true);
            video
              .play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          } else {
            setIsPlaying(false);
          }
        });
    }
  }, [requestMobileFullscreen]);

  // Initialize and load stream
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    clearAutoNextTimer();

    const video = videoRef.current;
    if (!video || !currentPlayableUrl) {
      if (streamLoading) {
        // Parent is still fetching the stream — keep the spinner running.
        setIsLoading(true);
      } else {
        setIsLoading(false);
        // No playable URL at all (episode locked, stream missing) — show the error
        // state instead of a blank screen with no feedback.
        if (streamCandidates.length === 0) {
          setHasError(true);
        }
      }
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isM3U8 = checkIsM3u8(currentPlayableUrl);

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        manifestLoadingMaxRetry: 2,
        levelLoadingMaxRetry: 2,
        fragLoadingMaxRetry: 2,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        }
      });
      hlsRef.current = hls;

      let recoverAttempts = 0;

      hls.loadSource(currentPlayableUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        recoverAttempts = 0;
        setIsLoading(false);
        safePlay();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        // Fatal network/media errors get a bounded number of recovery attempts,
        // then the player surfaces an error instead of retrying forever.
        const canRecover =
          recoverAttempts < 2 &&
          (data.type === Hls.ErrorTypes.NETWORK_ERROR || data.type === Hls.ErrorTypes.MEDIA_ERROR);

        if (canRecover) {
          recoverAttempts += 1;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else {
            hls.recoverMediaError();
          }
          return;
        }

        hls.destroy();
        hlsRef.current = null;
        if (activeStreamIndex < streamCandidates.length - 1) {
          setActiveStreamIndex((prev) => prev + 1);
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      });
    } else {
      // Direct MP4 or native HLS (Safari/iOS)
      video.src = currentPlayableUrl;
      video.load();

      const onCanPlay = () => {
        setIsLoading(false);
        safePlay();
      };

      const onError = () => {
        video.removeEventListener('canplay', onCanPlay);
        if (activeStreamIndex < streamCandidates.length - 1) {
          setActiveStreamIndex((prev) => prev + 1);
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      };

      video.addEventListener('canplay', onCanPlay, { once: true });
      video.addEventListener('error', onError, { once: true });

      return () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('error', onError);
      };
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentPlayableUrl, activeStreamIndex, streamCandidates.length, reloadNonce, streamLoading, safePlay, clearAutoNextTimer]);

  // Video playback event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0);
      setDuration(video.duration || 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      requestMobileFullscreen();
    };
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setShowControls(true);
      if (autoNext && onNextEpisode && episodeNumber < totalEpisodes) {
        clearAutoNextTimer();
        let count = 3;
        setAutoNextCountdown(count);
        autoNextTimerRef.current = setInterval(() => {
          count -= 1;
          if (count <= 0) {
            clearAutoNextTimer();
            onNextEpisode();
          } else {
            setAutoNextCountdown(count);
          }
        }, 1000);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('ended', handleEnded);
      clearAutoNextTimer();
    };
  }, [autoNext, onNextEpisode, episodeNumber, totalEpisodes, requestMobileFullscreen, clearAutoNextTimer]);

  // Auto-hide controls after 3.5s of inactivity while playing
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSpeedMenu(false);
      }
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      resetControlsTimeout();
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, resetControlsTimeout]);

  // Toggle play/pause (stop player)
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    clearAutoNextTimer();

    if (isPlaying) {
      video.pause();
      setCenterPlayIconState('pause');
      setShowControls(true);
    } else {
      safePlay();
      setCenterPlayIconState('play');
    }
    setTimeout(() => setCenterPlayIconState(null), 600);
    resetControlsTimeout();
  };

  // Double-tap seeking function: seeks 10s backward or forward
  const seekBy10Seconds = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    clearAutoNextTimer();
    const newTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    video.currentTime = newTime;
    setCurrentTime(newTime);

    setDoubleTapFeedback(seconds < 0 ? 'left' : 'right');
    setTimeout(() => setDoubleTapFeedback(null), 700);

    resetControlsTimeout();
  };

  // Screen click & tap handler:
  // - Double tap / click: Seek -10s on left, +10s on right
  // - Single tap / click: Toggle visibility of Controls, Episode UI, and Like UI
  const handleScreenAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightSide = clickX > rect.width / 2;
    const now = Date.now();
    const timeDiff = now - lastTapRef.current.time;
    const distDiff = Math.abs(clickX - lastTapRef.current.x);

    if (timeDiff < 320 && distDiff < 140) {
      // DOUBLE TAP CONFIRMED
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapRef.current = { time: 0, x: 0 };
      seekBy10Seconds(isRightSide ? 10 : -10);
    } else {
      // Possible single tap
      lastTapRef.current = { time: now, x: clickX };
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = setTimeout(() => {
        setShowControls((prev) => {
          const next = !prev;
          if (next && isPlaying) {
            resetControlsTimeout();
          }
          return next;
        });
        singleTapTimerRef.current = null;
      }, 260);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearAutoNextTimer();
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    resetControlsTimeout();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    resetControlsTimeout();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    video.muted = newMuted;
    setIsAutoplayMuted(false);
    resetControlsTimeout();
  };

  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setIsMuted(false);
    setIsAutoplayMuted(false);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
    resetControlsTimeout();
  };

  const toggleAspect = () => {
    setAspectMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
    resetControlsTimeout();
  };

  /** Re-attempts the current candidate; with several candidates it rotates to the next
   *  one, but never wraps back to a URL that already failed in this cycle. */
  const retryStream = () => {
    setHasError(false);
    setIsLoading(true);
    const count = streamCandidates.length;
    if (count > 1) {
      setActiveStreamIndex((prev) => Math.min(prev + 1, count - 1));
    } else {
      // Single candidate: force the load effect to re-run by clearing the video.
      const video = videoRef.current;
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
      setActiveStreamIndex(0);
      setReloadNonce((n) => n + 1);
    }
  };

  const formatTime = (timeInSec: number) => {
    if (isNaN(timeInSec)) return '00:00';
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none touch-manipulation"
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        playsInline
        webkit-playsinline="true"
        preload="auto"
        className={`w-full h-full transition-all duration-300 pointer-events-none ${
          aspectMode === 'contain' ? 'object-contain' : 'object-cover'
        }`}
      />

      {/* Screen Tap Overlay for Gestures & Double-Tap Seeking */}
      <div
        onClick={handleScreenAreaClick}
        className="absolute inset-0 z-10 cursor-pointer"
        title="Ketuk 1x untuk tampilkan/sembunyikan kontrol. Ketuk 2x untuk maju/mundur 10 detik"
      />

      {/* Center Play/Pause Indicator Animation */}
      {centerPlayIconState && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/80 backdrop-blur-md text-white flex items-center justify-center shadow-2xl animate-ping-once border border-white/10">
            {centerPlayIconState === 'play' ? (
              <Play className="w-8 h-8 fill-current ml-1 text-white" />
            ) : (
              <Pause className="w-8 h-8 fill-current text-white" />
            )}
          </div>
        </div>
      )}

      {/* Double Tap Seek Feedback: Left side (-10s Mundur) */}
      {doubleTapFeedback === 'left' && (
        <div className="absolute left-6 sm:left-14 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/85 backdrop-blur-md border border-red-500/60 text-white flex flex-col items-center justify-center shadow-2xl animate-pulse">
            <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7 text-red-400" />
            <span className="text-xs font-black text-red-200 mt-1">-10s</span>
          </div>
          <span className="text-[10px] font-bold text-white/90 mt-1 bg-black/70 px-2.5 py-0.5 rounded-full shadow border border-white/10">
            Mundur 10 Detik
          </span>
        </div>
      )}

      {/* Double Tap Seek Feedback: Right side (+10s Maju) */}
      {doubleTapFeedback === 'right' && (
        <div className="absolute right-6 sm:right-14 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/85 backdrop-blur-md border border-red-500/60 text-white flex flex-col items-center justify-center shadow-2xl animate-pulse">
            <RotateCw className="w-6 h-6 sm:w-7 sm:h-7 text-red-400" />
            <span className="text-xs font-black text-red-200 mt-1">+10s</span>
          </div>
          <span className="text-[10px] font-bold text-white/90 mt-1 bg-black/70 px-2.5 py-0.5 rounded-full shadow border border-white/10">
            Maju 10 Detik
          </span>
        </div>
      )}

      {/* Unmute Autoplay Prompt Banner */}
      {isAutoplayMuted && isPlaying && (
        <button
          onClick={handleUnmute}
          className="absolute top-16 left-4 z-40 px-3.5 py-2 bg-red-600/95 hover:bg-red-500 text-white rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-bounce cursor-pointer"
        >
          <VolumeX className="w-4 h-4" />
          <span>Ketuk untuk Bersuara 🔊</span>
        </button>
      )}

      {/* Locked VIP Episode Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 border border-amber-500/30">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1.5">Episode VIP Terkunci</h3>
          <p className="text-xs text-slate-300 max-w-xs mb-4 leading-relaxed">
            Episode {episodeNumber} memerlukan akses VIP resmi. Anda dapat beralih ke episode sebelumnya atau gunakan server cadangan.
          </p>
          {onPrevEpisode && episodeNumber > 1 && (
            <button
              onClick={onPrevEpisode}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg cursor-pointer"
            >
              Kembali ke Episode Sebelumnya
            </button>
          )}
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && !isLocked && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 bg-black/40">
          <div className="flex flex-col items-center gap-2.5">
            <Loader2 className="w-9 h-9 text-red-500 animate-spin" />
            <span className="text-[11px] font-bold text-slate-200 tracking-wider uppercase drop-shadow">
              Memuat Siaran...
            </span>
          </div>
        </div>
      )}

      {/* Error Overlay with Multi-Server Switch */}
      {hasError && !isLocked && (
        <div className="absolute inset-0 bg-black/92 flex flex-col items-center justify-center p-6 text-center z-30">
          <AlertCircle className="w-12 h-12 text-red-500 mb-2.5" />
          <h4 className="text-base font-bold text-white mb-1">Gagal Memutar Siaran Ini</h4>
          <p className="text-xs text-slate-400 max-w-xs mb-4 leading-relaxed">
            {errorMessage ||
              'Server CDN siaran sedang padat atau offline. Silakan coba beralih ke jalur cadangan berikut.'}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {streamCandidates.length > 0 && (
              <button
                onClick={retryStream}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
                {streamCandidates.length > 1 && ` (${activeStreamIndex + 1}/${streamCandidates.length})`}
              </button>
            )}
            {onNextEpisode && episodeNumber < totalEpisodes && (
              <button
                onClick={onNextEpisode}
                className="px-3.5 py-2 bg-[#1b1e2a] hover:bg-[#252a3b] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-white/10"
              >
                Coba Episode {episodeNumber + 1}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Auto-Next Countdown Notification */}
      {autoNextCountdown !== null && (
        <div className="absolute top-16 right-4 z-40 bg-[#0e1017]/95 border border-red-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm">
            {autoNextCountdown}
          </div>
          <div>
            <div className="text-xs text-slate-200 font-bold">Lanjut Episode Berikutnya</div>
            <button
              onClick={clearAutoNextTimer}
              className="text-[10px] text-slate-400 hover:text-white underline mt-0.5 cursor-pointer"
            >
              Batal Otomatis
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP OVERLAY: Close, Title, Episode Badge, Like, Share */}
      {/* Disappears automatically when playing; reappears on tap/click! */}
      {/* ========================================================================= */}
      <div
        className={`absolute top-0 inset-x-0 z-30 p-2.5 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between transition-all duration-300 pointer-events-auto ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {/* Left: Back/Close & Drama Title & Source */}
        <div className="flex items-center gap-2 max-w-[62%] sm:max-w-[70%]">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-black/60 hover:bg-red-600 text-slate-200 hover:text-white transition-all backdrop-blur-md active:scale-95 shrink-0 cursor-pointer border border-white/10"
              title="Tutup Player"
            >
              <ArrowLeft className="w-4 h-4 sm:hidden" />
              <X className="w-4 h-4 hidden sm:block" />
            </button>
          )}

          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 border ${
              source === 'flickreels'
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {source === 'flickreels' ? 'FLICK' : 'MELOLO'}
          </span>

          <h2 className="text-xs sm:text-sm font-bold text-white truncate drop-shadow">
            {title}
          </h2>

          <span className="hidden sm:inline-block text-[10px] font-mono font-bold text-red-300 bg-red-950/70 px-2 py-0.5 rounded border border-red-800/40 shrink-0">
            EP {episodeNumber}/{totalEpisodes}
          </span>
        </div>

        {/* Right: Quick Tab Switches + Share + LIKE BUTTON */}
        <div className="flex items-center gap-1 sm:gap-2">
          {onSelectTab && (
            <button
              onClick={() => onSelectTab('novel')}
              className="px-2 py-1.5 rounded-xl bg-black/60 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 backdrop-blur-md transition-colors cursor-pointer border border-white/10"
              title="Mode Baca Novel"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Novel</span>
            </button>
          )}

          {onShare && (
            <button
              onClick={onShare}
              className="p-1.5 sm:p-2 rounded-xl bg-black/60 hover:bg-white/10 text-slate-200 transition-colors backdrop-blur-md active:scale-95 cursor-pointer border border-white/10"
              title="Bagikan"
            >
              {copiedShare ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* LIKE / FAVORITE BUTTON */}
          {onFavoriteToggle && (
            <button
              onClick={onFavoriteToggle}
              className={`p-1.5 sm:p-2 rounded-xl transition-all backdrop-blur-md flex items-center gap-1 text-xs active:scale-90 cursor-pointer ${
                isFavorited
                  ? 'bg-red-600 text-white shadow-lg shadow-red-950 border border-red-500/50'
                  : 'bg-black/60 hover:bg-red-600/40 text-slate-200 border border-white/10'
              }`}
              title={isFavorited ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}
            >
              <Heart
                className={`w-4 h-4 ${
                  isFavorited ? 'fill-white text-white' : 'text-slate-200'
                }`}
              />
              <span className="hidden sm:inline font-bold">
                {isFavorited ? 'Tersimpan' : 'Suka'}
              </span>
            </button>
          )}

          {/* Desktop Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="hidden sm:flex p-2 rounded-xl bg-black/60 hover:bg-red-600 text-slate-300 hover:text-white transition-colors backdrop-blur-md cursor-pointer border border-white/10"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FLOATING EPISODE UI: Quick Episode Drawer Trigger */}
      {/* Disappears automatically when playing; reappears on tap/click! */}
      {/* ========================================================================= */}
      {onOpenEpisodeDrawer && (
        <div
          className={`absolute bottom-20 right-3 sm:right-5 z-25 transition-all duration-300 pointer-events-auto ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <button
            onClick={onOpenEpisodeDrawer}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#0e1017]/90 hover:bg-red-600 text-white text-xs font-bold shadow-2xl border border-white/15 backdrop-blur-md active:scale-95 transition-all group cursor-pointer"
            title="Buka Daftar Episode"
          >
            <ListFilter className="w-3.5 h-3.5 text-red-400 group-hover:text-white transition-colors" />
            <span>Episode {episodeNumber} / {totalEpisodes}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BOTTOM OVERLAY: Stop Player (Play/Pause), Progress, Time, Speeds, Fullscreen */}
      {/* Disappears automatically when playing; reappears on tap/click! */}
      {/* ========================================================================= */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-2.5 sm:p-4 pt-10 transition-all duration-300 pointer-events-auto ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Progress Scrubber */}
        <div className="flex items-center gap-2 mb-2 w-full">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 sm:h-2 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-red-600 transition-all"
            title="Geser durasi video"
          />
        </div>

        {/* Action Controls Row */}
        <div className="flex items-center justify-between text-white text-xs">
          {/* Left: Play/Pause (Stop Player), Prev, Next, Volume, Time */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Play/Pause (Stop player button) */}
            <button
              onClick={togglePlay}
              className="p-2 sm:p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950 transition-transform active:scale-90 cursor-pointer"
              title={isPlaying ? 'Jeda / Hentikan Siaran' : 'Putar Siaran'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Prev Episode */}
            {onPrevEpisode && (
              <button
                onClick={onPrevEpisode}
                disabled={episodeNumber <= 1}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors active:scale-95 cursor-pointer"
                title="Episode Sebelumnya"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Next Episode */}
            {onNextEpisode && (
              <button
                onClick={onNextEpisode}
                disabled={episodeNumber >= totalEpisodes}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors active:scale-95 cursor-pointer"
                title="Episode Berikutnya"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Volume toggle */}
            <button
              onClick={toggleMute}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors active:scale-95 cursor-pointer"
              title="Suara"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Desktop Volume Slider */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-12 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600 hidden md:block"
            />

            {/* Time Indicator */}
            <span className="text-[10px] sm:text-xs font-mono text-slate-300 ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right: Aspect, Speed, Auto-Next, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Auto Next Toggle */}
            {onAutoNextToggle && (
              <button
                onClick={() => onAutoNextToggle(!autoNext)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold hidden sm:inline transition-colors cursor-pointer ${
                  autoNext ? 'bg-red-600 text-white' : 'bg-white/10 text-slate-400'
                }`}
                title="Putar Otomatis Episode Berikutnya"
              >
                Auto-Next
              </button>
            )}

            {/* Aspect Mode Toggle (Fit / Fill) */}
            <button
              onClick={toggleAspect}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-mono text-slate-300 transition-colors cursor-pointer"
              title="Ubah Rasio Layar (Fit / Fill)"
            >
              {aspectMode === 'contain' ? 'Fit' : 'Fill'}
            </button>

            {/* Playback Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold font-mono transition-colors cursor-pointer"
                title="Kecepatan Siaran"
              >
                {playbackSpeed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-9 right-0 bg-[#0e1017] border border-white/10 rounded-xl shadow-2xl p-1 z-30 flex flex-col gap-0.5 w-20">
                  {speeds.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`px-2 py-1 text-[11px] rounded-lg text-left transition-colors cursor-pointer ${
                        playbackSpeed === s
                          ? 'bg-red-600 text-white font-bold'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5" />
              ) : (
                <Maximize className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
