import React, { useState, useEffect } from 'react';
import ImagePreview from './ImagePreview';
import VideoPreview from './VideoPreview';
import AudioPreview from './AudioPreview';
import DocumentPreview from './DocumentPreview';
import { FiDownload, FiPaperclip } from 'react-icons/fi';
import { getFileUrl } from '../../utils/fileUrl';

const inferTypeFromExtension = (filename) => {
  if (!filename) return 'other';
  const ext = filename.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) {
    return 'image';
  }
  if (['mp4', 'webm', 'mov'].includes(ext)) {
    return 'video';
  }
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return 'audio';
  }
  if (ext === 'pdf') {
    return 'pdf';
  }
  if (['doc', 'docx'].includes(ext)) {
    return 'word';
  }
  if (['xls', 'xlsx'].includes(ext)) {
    return 'excel';
  }
  return 'other';
};

const getMimeTypeFromExtension = (filename) => {
  if (!filename) return 'application/octet-stream';
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'ogg':
      return 'audio/ogg';
    case 'm4a':
      return 'audio/mp4';
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv':
      return 'text/csv';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
};

const FilePreviewCard = ({ url, name, size, type, mimeType }) => {
  const [resolvedSize, setResolvedSize] = useState(size);
  const [loading, setLoading] = useState(!size);
  const [error, setError] = useState(false);

  const resolvedName = name || (url ? url.substring(url.lastIndexOf('/') + 1) : 'attachment');
  const resolvedType = type || inferTypeFromExtension(resolvedName);
  const resolvedMimeType = mimeType || getMimeTypeFromExtension(resolvedName);
  
  // Resolve fileUrl using getFileUrl helper
  const fileUrl = getFileUrl(url);

  useEffect(() => {
    // If size is already provided, no need to fetch
    if (size !== undefined && size !== null) {
      setResolvedSize(size);
      setLoading(false);
      return;
    }

    if (!fileUrl) {
      setError(true);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Use a HEAD request to get file headers only
        const response = await fetch(fileUrl, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error('HEAD request failed');
        }
        
        const contentLength = response.headers.get('content-length');
        if (isMounted && contentLength) {
          setResolvedSize(parseInt(contentLength, 10));
        }
      } catch (err) {
        console.warn('Metadata fetch failed, trying lightweight GET request', err);
        if (isMounted) {
          try {
            const response = await fetch(fileUrl);
            const contentLength = response.headers.get('content-length');
            if (contentLength) {
              setResolvedSize(parseInt(contentLength, 10));
            }
          } catch (getErr) {
            console.error('GET request also failed to fetch metadata', getErr);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMetadata();
    return () => {
      isMounted = false;
    };
  }, [fileUrl, size]);

  const handleDownloadOnly = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = resolvedName;
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Loading Skeleton state
  if (loading) {
    return (
      <div className="w-[280px] h-32 bg-slate-900/40 border border-slate-800 rounded-xl p-3 animate-pulse flex flex-col justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-lg shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            <div className="h-3 bg-slate-800 rounded w-3/4" />
            <div className="h-2 bg-slate-800 rounded w-1/2" />
          </div>
        </div>
        <div className="h-7 bg-slate-800 rounded-lg w-full" />
      </div>
    );
  }

  // 2. Error Fallback state
  if (error || !fileUrl) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 max-w-[280px]">
        <div className="flex items-start gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
            <FiPaperclip className="text-lg" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate text-slate-200" title={resolvedName}>
              {resolvedName}
            </p>
            <p className="text-xs text-rose-400 mt-0.5">Unable to preview file</p>
          </div>
        </div>
        <button
          onClick={handleDownloadOnly}
          className="w-full mt-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center justify-center gap-1.5 border border-slate-700/50"
        >
          <FiDownload className="text-sm" />
          Download
        </button>
      </div>
    );
  }

  // 3. Render appropriate preview based on file type
  switch (resolvedType) {
    case 'image':
      return <ImagePreview url={fileUrl} name={resolvedName} size={resolvedSize} mimeType={resolvedMimeType} />;
    case 'video':
      return <VideoPreview url={fileUrl} name={resolvedName} size={resolvedSize} mimeType={resolvedMimeType} />;
    case 'audio':
      return <AudioPreview url={fileUrl} name={resolvedName} size={resolvedSize} mimeType={resolvedMimeType} />;
    case 'pdf':
    case 'word':
    case 'excel':
    case 'other':
    default:
      return (
        <DocumentPreview
          url={fileUrl}
          name={resolvedName}
          size={resolvedSize}
          type={resolvedType}
          mimeType={resolvedMimeType}
        />
      );
  }
};

export default FilePreviewCard;
