import React, { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiDownload, FiPaperclip } from 'react-icons/fi';
import { formatFileSize } from '../../utils/fileUtils';
import { getFileUrl } from '../../utils/fileUrl';

const AudioPreview = ({ url, name, size, mimeType }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fileUrl = getFileUrl(url);

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = name;
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoaded(true);
    };

    const handleAudioEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleAudioError = () => {
      setError(true);
      console.error('File preview failed:', {
        url: fileUrl,
        mimeType: mimeType || 'audio/unknown',
        name
      });
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleAudioEnded);
    audio.addEventListener('error', handleAudioError);

    // If source changes, reload
    audio.load();

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleAudioEnded);
      audio.removeEventListener('error', handleAudioError);
    };
  }, [fileUrl]);

  const togglePlay = () => {
    if (error) return;
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.error('Audio play error:', err);
            setError(true);
          });
      }
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds === Infinity) return '00:00';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 max-w-[280px]">
        <div className="flex items-start gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
            <FiPaperclip className="text-lg" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate text-slate-200" title={name}>
              {name}
            </p>
            <p className="text-xs text-rose-400 mt-0.5">Unable to preview file</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="w-full mt-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center justify-center gap-1.5 border border-slate-700/50"
        >
          <FiDownload className="text-sm" />
          Download
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 hover:bg-slate-900/60 border border-slate-800 rounded-xl p-3 max-w-[280px] w-full flex flex-col gap-2 transition-all">
      {/* Hidden native audio element with source tag */}
      <audio ref={audioRef} preload="metadata">
        <source src={fileUrl} type={mimeType || 'audio/mpeg'} />
        Your browser does not support the audio element.
      </audio>

      {/* Row 1: Filename with music note */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base select-none shrink-0">🎵</span>
          <span className="text-xs font-semibold text-slate-200 truncate select-all" title={name}>
            {name}
          </span>
        </div>
        <button
          onClick={handleDownload}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors shrink-0"
          title="Download"
        >
          <FiDownload size={13} />
        </button>
      </div>

      {/* Row 2: Player Interface */}
      <div className="flex items-center gap-2.5 mt-1">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shrink-0 hover:scale-105 shadow-md"
        >
          {isPlaying ? (
            <FiPause size={14} className="fill-current" />
          ) : (
            <FiPlay size={14} className="fill-current translate-x-0.5" />
          )}
        </button>

        {/* Progress bar slider */}
        <div className="flex-1 relative flex items-center group">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none hover:h-1.5 transition-all"
            style={{
              background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                duration ? (currentTime / duration) * 100 : 0
              }%, #1E293B ${duration ? (currentTime / duration) * 100 : 0}%, #1E293B 100%)`,
            }}
          />
        </div>

        {/* Volume Button */}
        <button
          onClick={toggleMute}
          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors shrink-0"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <FiVolumeX size={15} /> : <FiVolume2 size={15} />}
        </button>
      </div>

      {/* Row 3: Timestamps and Size */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 select-none">
        <span>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <span>
          {formatFileSize(size)}
        </span>
      </div>
    </div>
  );
};

export default AudioPreview;
