import React, { useState, useRef } from 'react';
import { FiDownload, FiExternalLink, FiPaperclip, FiPlay } from 'react-icons/fi';
import { formatFileSize } from '../../utils/fileUtils';
import { getFileUrl } from '../../utils/fileUrl';

const VideoPreview = ({ url, name, size, mimeType }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

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

  const handleOpen = (e) => {
    e.stopPropagation();
    window.open(fileUrl, '_blank', 'noreferrer');
  };

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error('Video play error:', err);
        });
    }
  };

  const handleError = () => {
    setError(true);
    console.error('File preview failed:', {
      url: fileUrl,
      mimeType: mimeType || 'video/unknown',
      name
    });
  };

  if (error) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 max-w-[300px]">
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
    <div className="group relative max-w-[300px] w-full flex flex-col gap-2">
      {/* Video Container */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950/60 border border-slate-800 shadow-inner">
        {/* Loading skeleton */}
        {!loaded && (
          <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
          </div>
        )}

        <video
          ref={videoRef}
          preload="metadata"
          controls={isPlaying}
          onLoadedData={() => setLoaded(true)}
          onError={handleError}
          className={`w-full h-full object-cover ${loaded ? 'block' : 'hidden'}`}
        >
          <source src={fileUrl} type={mimeType || 'video/mp4'} />
          Your browser does not support the video tag.
        </video>

        {/* Play Overlay */}
        {loaded && !isPlaying && (
          <div 
            onClick={handlePlayClick}
            className="absolute inset-0 bg-slate-950/40 hover:bg-slate-950/50 cursor-pointer flex items-center justify-center transition-colors"
          >
            <div className="w-14 h-14 rounded-full bg-blue-600/90 hover:bg-blue-500 hover:scale-110 text-white flex items-center justify-center transition-all shadow-xl">
              <FiPlay className="text-xl fill-current ml-1" />
            </div>
            
            {/* Quick Actions at Top Right */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleDownload}
                className="w-8 h-8 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-center transition-colors"
                title="Download"
              >
                <FiDownload size={14} />
              </button>
              <button
                onClick={handleOpen}
                className="w-8 h-8 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-center transition-colors"
                title="Open in new tab"
              >
                <FiExternalLink size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="flex justify-between items-center px-1">
        <div className="min-w-0 flex-1 pr-2">
          <span className="block text-xs font-semibold text-slate-200 truncate select-all" title={name}>
            {name}
          </span>
          <span className="text-[10px] text-slate-400">
            {formatFileSize(size)}
          </span>
        </div>
        {isPlaying && (
          <div className="flex items-center gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleDownload}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
              title="Download"
            >
              <FiDownload size={14} />
            </button>
            <button
              onClick={handleOpen}
              className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
              title="Open in new tab"
            >
              <FiExternalLink size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPreview;
