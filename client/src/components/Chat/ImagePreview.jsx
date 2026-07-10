import React, { useState } from 'react';
import { FiDownload, FiExternalLink, FiPaperclip, FiX, FiEye } from 'react-icons/fi';
import { formatFileSize } from '../../utils/fileUtils';
import { getFileUrl } from '../../utils/fileUrl';

const ImagePreview = ({ url, name, size, mimeType }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  const handleError = () => {
    setError(true);
    console.error('File preview failed:', {
      url: fileUrl,
      mimeType: mimeType || 'image/unknown',
      name
    });
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
    <div className="group relative max-w-[280px] w-full flex flex-col gap-2">
      {/* Image Thumbnail Container */}
      <div 
        className="relative w-full aspect-video md:aspect-[4/3] rounded-xl overflow-hidden bg-slate-900/40 border border-slate-800 cursor-pointer shadow-inner"
        onClick={() => setLightboxOpen(true)}
      >
        {/* Loading Skeleton */}
        {!loaded && (
          <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
          </div>
        )}

        <img
          src={fileUrl}
          alt={name}
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Hover Overlay Actions */}
        {loaded && (
          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-blue-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg"
              title="Zoom In"
            >
              <FiEye className="text-lg" />
            </button>
            <button
              onClick={handleDownload}
              className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-blue-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg"
              title="Download"
            >
              <FiDownload className="text-lg" />
            </button>
            <button
              onClick={handleOpen}
              className="w-10 h-10 rounded-full bg-slate-800/80 hover:bg-blue-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-lg"
              title="Open in new tab"
            >
              <FiExternalLink className="text-lg" />
            </button>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="flex flex-col px-1">
        <span className="text-xs font-semibold text-slate-200 truncate select-all" title={name}>
          {name}
        </span>
        <span className="text-[10px] text-slate-400">
          {formatFileSize(size)}
        </span>
      </div>

      {/* Lightbox / Modal */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Header Bar */}
          <div 
            className="absolute top-0 inset-x-0 h-16 flex items-center justify-between px-6 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pr-4">
              <h3 className="text-sm font-semibold truncate max-w-md">{name}</h3>
              <p className="text-xs text-slate-400">{formatFileSize(size)}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleDownload}
                className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Download"
              >
                <FiDownload size={18} />
              </button>
              <button
                onClick={handleOpen}
                className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Open original link"
              >
                <FiExternalLink size={18} />
              </button>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <FiX size={20} />
              </button>
            </div>
          </div>

          {/* Lightbox Content */}
          <div 
            className="relative max-w-5xl max-h-[80vh] flex items-center justify-center mt-12"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fileUrl}
              alt={name}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl select-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagePreview;
