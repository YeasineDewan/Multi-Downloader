import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Maximize,
  RotateCcw,
  Sparkles,
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
  const [hasPlaybackError, setHasPlaybackError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!media) return null;

  const title = media.title;
  const author = media.author;
  const thumbnail = media.thumbnail;
  const isAudioOnly =
    ('type' in media && media.type === 'audio') ||
    media.title.toLowerCase().includes('audio') ||
    media.url.includes('spotify') ||
    media.url.includes('soundcloud');

  const directStreamUrl =
    ('directMediaUrl' in media && media.directMediaUrl) ||
    ('downloadUrl' in media && media.downloadUrl) ||
    (media.url && !media.url.includes('youtube.com') && !media.url.includes('spotify.com') ? media.url : '') ||
    (isAudioOnly
      ? '/api/download?format=wav&title=AudioPreview'
      : '/api/download?format=mp4&title=VideoPreview');

  // Sync play/pause with DOM element
  useEffect(() => {
    const el = isAudioOnly ? audioRef.current : videoRef.current;
    if (!el) return;
    if (isPlaying) {
      el.play().catch(() => {
        // Autoplay may be restricted by browser until user interaction
        setIsPlaying(false);
      });
    } else {
      el.pause();
    }
  }, [isPlaying, isAudioOnly, directStreamUrl]);

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
      <div className="relative w-full max-w-2xl bg-neutral-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-white/[0.08]">
          <div className="min-w-0 pr-4">
            <h3 className="text-sm font-bold text-white truncate">{title}</h3>
            <p className="text-xs text-neutral-400 truncate">{author}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Canvas */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {isAudioOnly ? (
            <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center relative w-full h-full">
              {/* Hidden HTML5 Audio Element for real playback */}
              <audio
                ref={audioRef}
                src={directStreamUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onError={() => setHasPlaybackError(true)}
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
              {/* Real HTML5 Video element */}
              <video
                ref={videoRef}
                src={directStreamUrl}
                poster={thumbnail}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onError={() => setHasPlaybackError(true)}
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

        {/* Player Controls Bar */}
        <div className="p-5 space-y-4 bg-neutral-950/80 border-t border-white/[0.08]">
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

          {/* Lower buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200 transition-colors shadow-md active:scale-95"
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
                className="p-2 text-neutral-400 hover:text-white rounded-lg transition-colors hover:bg-neutral-800"
                title="Restart playback"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Volume */}
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
      </div>
    </div>
  );
};
