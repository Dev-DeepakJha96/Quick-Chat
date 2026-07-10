import React from 'react';
import { FaFilePdf, FaFileWord, FaFileExcel, FaFile } from 'react-icons/fa';
import { FiDownload, FiExternalLink } from 'react-icons/fi';
import { formatFileSize } from '../../utils/fileUtils';
import { getFileUrl } from '../../utils/fileUrl';

const DocumentPreview = ({ url, name, size, type, mimeType }) => {
  const fileUrl = getFileUrl(url);

  const getDocIcon = () => {
    switch (type) {
      case 'pdf':
        return <FaFilePdf className="text-5xl text-rose-500 filter drop-shadow-md" />;
      case 'word':
        return <FaFileWord className="text-5xl text-blue-500 filter drop-shadow-md" />;
      case 'excel':
        return <FaFileExcel className="text-5xl text-emerald-500 filter drop-shadow-md" />;
      default:
        return <FaFile className="text-5xl text-slate-400 filter drop-shadow-md" />;
    }
  };

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

  return (
    <div 
      onClick={handleOpen}
      className="group bg-slate-900/40 hover:bg-slate-900/65 border border-slate-800 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col max-w-[280px] w-full shadow-md hover:shadow-lg"
    >
      {/* Top visually rich preview area */}
      <div className="w-full h-28 bg-slate-950/30 flex items-center justify-center border-b border-slate-800/60 relative group-hover:bg-slate-950/45 transition-colors">
        {getDocIcon()}
        
        {/* Floating Quick Action overlay */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4">
          <button
            onClick={handleOpen}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-blue-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-md"
            title="Open file"
          >
            <FiExternalLink size={15} />
          </button>
          <button
            onClick={handleDownload}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-blue-600 text-white flex items-center justify-center transition-all hover:scale-110 shadow-md"
            title="Download file"
          >
            <FiDownload size={15} />
          </button>
        </div>
      </div>

      {/* Info Block */}
      <div className="p-3 flex items-start justify-between gap-2.5 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-200 truncate select-all" title={name}>
            {name}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {formatFileSize(size)}
          </p>
        </div>
        
        {/* Fallback small actions for mobile/no-hover */}
        <div className="flex gap-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity self-center md:hidden">
          <button
            onClick={handleDownload}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            <FiDownload size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
