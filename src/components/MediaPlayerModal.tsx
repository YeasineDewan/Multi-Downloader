import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Layers,
  Radio,
} from 'lucide-react';
import { DownloadTask, MediaAnalysisResult } from '../types';

interface MediaPlayerModalProps {
  media: MediaAnalysisResult | DownloadTask | null;
  onClose: () => void;
}

export const MediaPlayerModal: React.FC<MediaPlayerModalProps> = ({ media, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(85);
  const [useProxy, setUseProxy] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [viewMode, setViewMode] = useState<'embed' | 'stream'>('embed');

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!media) return null;

  const title = media.title;
  const author = media.author;
  const thumbnail = media.thumbnail;

  // Detect platform & embed IDs
  const rawUrl = media.url || '';
  const isYouTube =
    rawUrl.includes('youtube.com') ||
    rawUrl.includes('youtu.be') ||
    ('platform' in media && media.platform?.id === 'youtube');

  const youtubeVideoId = useMemo(() => {
    if (!isYouTube) return null;
    const match = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : null;
  }, [rawUrl, isYouTube]);

  const isSpotify =
    rawUrl.includes('spotify.com') ||
    ('platform' in media && media.platform?.id === 'spotify');

  const spotifyTrackId = useMemo(() => {
    if (!isSpotify) return null;
    const match = rawUrl.match(/track\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }, [rawUrl, isSpotify]);

  const isVimeo =
    rawUrl.includes('vimeo.com') ||
    ('platform' in media && media.platform?.id === 'vimeo');

  const vimeoId = useMemo(() => {
    if (!isVimeo) return null;
    const match = rawUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)/);
    return match ? match[3] : null;
  }, [rawUrl, isVimeo]);

  const isSoundCloud =
    rawUrl.includes('soundcloud.com') ||
    ('platform' in media && media.platform?.id === 'soundcloud');

  const isAudioOnly =
    ('type' in media && media.type === 'audio') ||
    isSpotify ||
    isSoundCloud ||
    title.toLowerCase().includes('audio');

  // Compute embed URL if available
  const nativeEmbedUrl = useMemo(() => {
    if ('embedUrl' in media && media.embedUrl) {
      return media.embedUrl;
    }
    if (isYouTube && youtubeVideoId) {
      return `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&rel=0&modestbranding=1`;
    }
    if (isSpotify && spotifyTrackId) {
      return `https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`;
    }
    if (isVimeo && vimeoId) {
      return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
    }
    if (isSoundCloud) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(rawUrl)}&color=%23ff5500&auto_play=true`;
    }
    return null;
  }, [media, isYouTube, youtubeVideoId, isSpotify, spotifyTrackId, isVimeo, vimeoId, isSoundCloud, rawUrl]);

  const hasNativeEmbed = Boolean(nativeEmbedUrl);

  // Fallback direct stream URL
  const baseStreamUrl =
    ('directMediaUrl' in media && media.directMediaUrl) ||
    ('downloadUrl' in media && media.downloadUrl) ||
    (rawUrl && !isYouTube && !isSpotify && !isVimeo && !isSoundCloud ? rawUrl : '') ||
    (isAudioOnly
      ? '/api/download?format=wav&title=AudioPreview'
      : '/api/download?format=mp4&title=VideoPreview');

  const directStreamUrl = useProxy
    ? `/api/proxy-media?url=${encodeURIComponent(baseStreamUrl)}`
    : baseStreamUrl;

  // Sync play/pause with DOM element in stream mode
  useEffect(() => {
    if (hasNativeEmbed && viewMode === 'embed') return;
    const el = isAudioOnly ? audioRef.current : videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      el.pause();
    }
  }, [isPlaying, isAudioOnly, directStreamUrl, viewMode, hasNativeEmbed]);

  // Sync volume with DOM element
  useEffect(() => {
    const el = isAudioOnly ? audioRef.current : videoRef.current;
    if (!el) return;
    el.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted, isAudioOnly]);

  const handleTimeUpdate = () => {
    const el = isAudioOnly ? audioRef.current : videoRef.current;
    if (el && !isNaN(el.currentTime)) {
      setCurrentTime(Math.floor(el.currentTime));
    }
  };

  const handleLoadedMetadata = () => {
    const el = isAudioOnly ? audioRef.current : videoRef.current;
    if (el && !isNaN(el.duration) && el.duration > 0) {
      setDuration(Math.floor(el.duration));
    }
  };

  const handleSeek = (seconds: number) => {
    const el = isAudioOnly ? audioRef.current : videoRef.current;
    if (el) {
      el.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const downloadTargetUrl =
    ('directMediaUrl' in media && media.directMediaUrl) || media.url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#0D0E12] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-white/[0.08] bg-neutral-900/40">
          <div className="min-w-0 pr-4">
            <h3 className="text-sm font-bold text-white truncate">{title}</h3>
            <p className="text-xs text-neutral-400 truncate">{author}</p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {hasNativeEmbed && (
              <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-white/10 text-[11px]">
                <button
                  onClick={() => setViewMode('embed')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === 'embed'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Native Player
                </button>
                <button
                  onClick={() => setViewMode('stream')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    viewMode === 'stream'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Direct Stream
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Canvas Viewport */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden w-full">
          {hasNativeEmbed && viewMode === 'embed' ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <iframe
                src={nativeEmbedUrl!}
                title={title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : isAudioOnly ? (
            <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center relative w-full h-full bg-gradient-to-b from-neutral-900/60 to-black">
              {/* HTML5 Audio Element */}
              <audio
                ref={audioRef}
                src={directStreamUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onError={() => {
                  if (!useProxy && baseStreamUrl) {
                    setUseProxy(true);
                  } else {
                    setHasPlaybackError(true);
                  }
                }}
                autoPlay
              />

              <div
                className={`w-36 h-36 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl transition-transform ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '8s' }}
              >
                <img
                  src={thumbnail || '/src/assets/images/audio_studio_disc_1791840709109.jpg'}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Dynamic Waveform Visualizer */}
              <div className="flex items-end gap-1.5 h-10 mt-2">
                {[14, 28, 18, 36, 22, 12, 30, 40, 18, 26, 38, 14, 24, 20, 32, 16, 28].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-full transition-all duration-200"
                    style={{
                      height: isPlaying ? `${Math.min(38, Math.max(6, h + ((currentTime * 3 + i * 2) % 18)))}px` : '4px',
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {/* HTML5 Video element */}
              <video
                ref={videoRef}
                src={directStreamUrl}
                poster={thumbnail}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onError={() => {
                  if (!useProxy && baseStreamUrl) {
                    setUseProxy(true);
                  } else {
                    setHasPlaybackError(true);
                  }
                }}
                className="w-full h-full object-contain"
                playsInline
                autoPlay
              />

              {/* Play Overlay if paused */}
              {!isPlaying && (
                <div
                  onClick={() => setIsPlaying(true)}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer transition-opacity"
                >
                  <button className="w-16 h-16 rounded-full bg-white/25 backdrop-blur-md border border-white/40 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl">
                    <Play className="w-7 h-7 ml-1 fill-white" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Player Controls Bar for Stream Mode */}
        {(!hasNativeEmbed || viewMode === 'stream') && (
          <div className="p-5 space-y-4 bg-neutral-950/90 border-t border-white/[0.08]">
            {/* Scrubber slider */}
            <div className="space-y-1.5">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-xs text-neutral-400 font-mono">
                <span>{formatSec(currentTime)}</span>
                <span>{formatSec(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-colors shadow-md active:scale-95 cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-black" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5 fill-black" />
                  )}
                </button>

                <button
                  onClick={() => handleSeek(0)}
                  className="p-2 text-neutral-400 hover:text-white rounded-lg transition-colors hover:bg-neutral-800 cursor-pointer"
                  title="Restart playback"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Volume slider */}
                <div className="hidden sm:flex items-center gap-2 text-neutral-400 pl-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="hover:text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      setIsMuted(false);
                    }}
                    className="w-20 h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-neutral-300"
                  />
                </div>
              </div>

              <a
                href={`/api/download?url=${encodeURIComponent(
                  downloadTargetUrl
                )}&title=${encodeURIComponent(title)}&format=${isAudioOnly ? 'mp3' : 'mp4'}&type=${
                  isAudioOnly ? 'audio' : 'video'
                }`}
                download={`${title.replace(/[/\\?%*:|"<>]/g, '_')}.${isAudioOnly ? 'mp3' : 'mp4'}`}
                className="px-4 py-2 bg-white text-black hover:bg-neutral-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {isAudioOnly ? 'MP3' : 'MP4'}</span>
              </a>
            </div>
          </div>
        )}

        {/* Footer info for native embed */}
        {hasNativeEmbed && viewMode === 'embed' && (
          <div className="p-4 px-6 bg-neutral-950/90 border-t border-white/[0.08] flex items-center justify-between text-xs">
            <span className="text-neutral-400">
              Interactive preview powered by native platform player
            </span>
            <a
              href={`/api/download?url=${encodeURIComponent(
                downloadTargetUrl
              )}&title=${encodeURIComponent(title)}&format=${isAudioOnly ? 'mp3' : 'mp4'}&type=${
                isAudioOnly ? 'audio' : 'video'
              }`}
              download={`${title.replace(/[/\\?%*:|"<>]/g, '_')}.${isAudioOnly ? 'mp3' : 'mp4'}`}
              className="px-4 py-2 bg-white text-black hover:bg-neutral-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {isAudioOnly ? 'MP3' : 'MP4'}</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
