import React, { useState, useRef, useEffect } from 'react';
import Avatar from '../UI/Avatar';
import {
  FiCornerUpLeft,
  FiEdit2,
  FiTrash2,
  FiFileText,
  FiImage,
  FiPlay,
  FiDownload,
  FiCheck,
  FiMoreHorizontal,
} from 'react-icons/fi';
import { IoCheckmark, IoCheckmarkDone } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import FilePreviewCard from '../Chat/FilePreviewCard';

const MessageBubble = ({
  msg,
  isOwn,
  currentUserId,
  onReply,
  onEditInitiate,
  onDelete,
  onReact,
  onUnreact,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClose = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClose);
    return () => document.removeEventListener('mousedown', handleClose);
  }, [menuOpen]);

  if (!msg) return null;

  const isDeleted = msg.isDeleted;
  const isEdited = msg.isEdited;
  const reactions = msg.reactions || [];

  // Check if message is a file/image URL or contains attachments
  const hasAttachments = msg.attachments && msg.attachments.length > 0;
  const isUpload = msg.text?.startsWith('/uploads/') || msg.text?.includes('res.cloudinary.com') || msg.text?.includes('/uploads/') || hasAttachments;

  // Group reactions: { emoji: { count, users: [], hasReacted } }
  const groupedReactions = reactions.reduce((acc, curr) => {
    const emoji = curr.emoji;
    if (!acc[emoji]) {
      acc[emoji] = { count: 0, users: [], hasReacted: false };
    }
    acc[emoji].count += 1;
    
    const userVal = curr.user;
    const userId = typeof userVal === 'object' ? userVal?._id : userVal;
    const username = typeof userVal === 'object' ? userVal?.username : 'Someone';
    
    acc[emoji].users.push(username);
    if (userId === currentUserId) {
      acc[emoji].hasReacted = true;
    }
    return acc;
  }, {});

  const handleReactionClick = (emoji, hasReacted) => {
    if (hasReacted) {
      onUnreact(msg._id, emoji);
    } else {
      onReact(msg._id, emoji);
    }
  };

  // Standard reaction emojis
  const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Check if read by anyone else
  const isReadByOthers = msg.readBy && msg.readBy.some((r) => {
    const rUserId = typeof r.user === 'object' ? r.user?._id : r.user;
    return rUserId !== currentUserId;
  });

  return (
    <div
      className={`flex items-start gap-2 max-w-[85%] md:max-w-[70%] ${
        isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'
      } relative mb-2`}
    >
      {/* Sender Avatar */}
      {!isOwn && (
        <Avatar
          user={msg.sender}
          size="sm"
          className="shadow-md shrink-0"
        />
      )}

      {/* Message & Actions wrapper */}
      <div className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'} max-w-[calc(100%-36px)]`}>
        {/* Sender Name */}
        {!isOwn && (
          <span className="text-[11px] font-semibold text-slate-400 pl-1 select-none">
            @{msg.sender?.username || 'unknown'}
          </span>
        )}

        {/* Message and Options Row */}
        <div className={`flex items-center gap-2 group/bubble relative ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Message Card */}
          <div
            className={`rounded-2xl px-3 py-1.5 shadow-md relative w-fit transition-colors duration-200 ${
              isOwn
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/60 dark:border-transparent rounded-tl-none'
            } ${isDeleted ? 'italic text-slate-500 bg-slate-100 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800' : ''}`}
          >
            {/* Reply Reference Preview */}
            {msg.replyTo && !isDeleted && (
              <div
                className={`mb-1 p-1.5 rounded-lg text-[11px] border-l-2 cursor-pointer truncate ${
                  isOwn
                    ? 'bg-blue-700/50 border-blue-400 text-slate-200'
                    : 'bg-slate-100 dark:bg-slate-900/60 border-blue-500 text-slate-600 dark:text-slate-300'
                }`}
                onClick={() => {
                  const element = document.getElementById(`msg-${msg.replyTo._id || msg.replyTo}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('bg-blue-500/20');
                    setTimeout(() => element.classList.remove('bg-blue-500/20'), 1500);
                  }
                }}
              >
                <p className="font-semibold mb-0.5">
                  Replying to {typeof msg.replyTo === 'object' ? `@${msg.replyTo.sender?.username || 'user'}` : 'message'}
                </p>
                <p className="truncate opacity-80">
                  {typeof msg.replyTo === 'object' ? msg.replyTo.text : 'Click to view message'}
                </p>
              </div>
            )}

            {/* Message Content */}
            {isDeleted ? (
              <p className="text-xs">This message was deleted</p>
            ) : isUpload ? (
              <div className="flex flex-col gap-2 mt-0.5">
                {msg.attachments && msg.attachments.length > 0 ? (
                  msg.attachments.map((att, idx) => (
                    <FilePreviewCard
                      key={att._id || idx}
                      url={att.url}
                      name={att.name}
                      size={att.size}
                      type={att.type}
                      mimeType={att.mimeType}
                    />
                  ))
                ) : (
                  <FilePreviewCard
                    url={msg.text}
                  />
                )}
              </div>
            ) : (
              <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap font-medium">{msg.text}</p>
            )}

            {/* Footer stats: Time, Edited indicator, Read status */}
            <div className="flex items-center justify-end gap-1 mt-0.5 text-[11px] opacity-60 select-none">
              {isEdited && !isDeleted && <span className="text-[10px] mr-0.5">(edited)</span>}
              <span>
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {isOwn && (
                <span className="flex items-center justify-center ml-1.5 shrink-0">
                  {isReadByOthers ? (
                    <IoCheckmarkDone size={15} className="text-sky-400" />
                  ) : (
                    <IoCheckmark size={15} className="text-slate-400" />
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Options Trigger Button (Hidden on desktop until hover, always visible on mobile) */}
          {!isDeleted && (
            <div className="relative self-center shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-slate-450 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/30 transition-all shadow-sm ${
                  menuOpen 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white opacity-100' 
                    : 'bg-transparent opacity-100 md:opacity-0 md:group-hover/bubble:opacity-100'
                }`}
                title="Message actions"
              >
                <FiMoreHorizontal className="text-sm" />
              </button>

              {/* Action Dropdown Popover */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className={`absolute bottom-full mb-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-2xl p-2 z-50 min-w-[210px] ${
                      isOwn ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'
                    }`}
                  >
                    {/* Emojis Reaction Row */}
                    <div className="flex gap-1 border-b border-slate-150 dark:border-slate-800/80 pb-2 mb-2 justify-between px-1">
                      {reactionEmojis.map((emoji) => {
                        const hasReacted = groupedReactions[emoji]?.hasReacted;
                        return (
                          <button
                            key={emoji}
                            onClick={() => {
                              handleReactionClick(emoji, hasReacted);
                              setMenuOpen(false);
                            }}
                            className={`hover:scale-125 transition-transform text-base p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${
                              hasReacted ? 'bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 dark:border-blue-500/30 text-blue-600 dark:text-blue-400' : ''
                            }`}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-0.5">
                      {/* Reply */}
                      <button
                        onClick={() => {
                          onReply(msg);
                          setMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors text-left"
                      >
                        <FiCornerUpLeft className="text-sm text-slate-400" />
                        Reply
                      </button>

                      {/* Edit */}
                      {isOwn && !isUpload && (
                        <button
                          onClick={() => {
                            onEditInitiate(msg);
                            setMenuOpen(false);
                          }}
                          className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors text-left"
                        >
                          <FiEdit2 className="text-sm text-slate-400" />
                          Edit Message
                        </button>
                      )}

                      {/* Delete */}
                      {isOwn && (
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            if (window.confirm('Delete this message for everyone?')) {
                              onDelete(msg._id);
                            }
                          }}
                          className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-rose-500 hover:text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold transition-colors text-left"
                        >
                          <FiTrash2 className="text-sm" />
                          Delete Message
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Reaction Badges */}
        {reactions.length > 0 && !isDeleted && (
          <div className="flex flex-wrap gap-1 mt-0.5 pl-1">
            {Object.entries(groupedReactions).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji, data.hasReacted)}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
                  data.hasReacted
                    ? 'bg-blue-500/5 border-blue-500/45 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/40 dark:text-blue-400'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title={data.users.join(', ')}
              >
                <span>{emoji}</span>
                <span>{data.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
