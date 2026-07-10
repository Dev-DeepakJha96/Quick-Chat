import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../UI/Avatar';
import MessageBubble from '../Message';
import { formatFullDate } from '../../utils/date';
import {
  FiSend,
  FiPaperclip,
  FiSmile,
  FiCornerUpLeft,
  FiX,
  FiArrowLeft,
  FiPhone,
  FiVideo,
  FiFileText,
  FiMessageSquare,
  FiMoreVertical,
  FiTrash2
} from 'react-icons/fi';
import { LuMessageSquareText } from "react-icons/lu";
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService } from '../../services/chat';
import { toast } from 'react-toastify';

const ChatWindow = () => {
  const { user } = useAuth();
  const {
    activeConversation,
    selectConversation,
    messages,
    loadingMessages,
    hasMoreMessages,
    fetchOlderMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    clearChatHistory,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
    typingUsers,
  } = useChat();

  const { isDark } = useTheme();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef(null);

  useEffect(() => {
    setHeaderMenuOpen(false);
  }, [activeConversation?._id]);

  useEffect(() => {
    if (!headerMenuOpen) return;
    const handleClose = (e) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClose);
    return () => document.removeEventListener('mousedown', handleClose);
  }, [headerMenuOpen]);

  const handleClearChatClick = async () => {
    setHeaderMenuOpen(false);
    if (window.confirm('Are you sure you want to clear all chat history for yourself? This action cannot be undone.')) {
      await clearChatHistory(activeConversation._id);
    }
  };
  
  // States for Editing and Replying
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingMessage, setReplyingMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const otherParticipant = activeConversation
    ? activeConversation.participants.find((p) => p._id !== user?._id)
    : null;

  // Scroll to bottom helper
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // Scroll to bottom on initial load and when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('auto');
    }
  }, [activeConversation?._id, scrollToBottom]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length, scrollToBottom]);

  // Handle typing triggers
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    
    // Trigger typing event
    startTyping();

    // Clear previous stop typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText('');
    stopTyping();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      if (editingMessage) {
        // Edit mode
        await editMessage(editingMessage._id, textToSend);
        setEditingMessage(null);
      } else {
        // Send mode (supports replyingMessage)
        await sendMessage(activeConversation._id, textToSend, replyingMessage?._id);
        setReplyingMessage(null);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to send message.');
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size cannot exceed 100MB');
      return;
    }

    setUploading(true);
    const uploadToastId = toast.loading(`Uploading file: ${file.name}...`);
    try {
      // 1. Upload file
      const response = await chatService.uploadFile(file);
      if (response.success && response.data?.file) {
        const fileUrl = response.data.file.url;
        
        // 2. Send file URL as message
        await sendMessage(activeConversation._id, fileUrl, replyingMessage?._id);
        setReplyingMessage(null);
        toast.update(uploadToastId, {
          render: 'File uploaded successfully!',
          type: 'success',
          isLoading: false,
          autoClose: 2000,
        });
      }
    } catch (error) {
      console.error('File upload failed:', error);
      toast.update(uploadToastId, {
        render: error.message || 'Failed to upload file.',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEditInitiate = (msg) => {
    setEditingMessage(msg);
    setInputText(msg.text);
    setReplyingMessage(null);
  };

  const handleReplyInitiate = (msg) => {
    setReplyingMessage(msg);
    setEditingMessage(null);
    setInputText('');
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  const handleCancelReply = () => {
    setReplyingMessage(null);
  };

  const handleComingSoon = (feature) => {
    toast.info(`${feature.charAt(0).toUpperCase() + feature.slice(1)} is currently decorative and coming soon!`);
  };

  // Group messages by Date (YYYY-MM-DD)
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(msg);
    return groups;
  }, {});

  const activeTypingMap = activeConversation ? typingUsers[activeConversation._id] || {} : {};
  const activeTypingUsernames = Object.values(activeTypingMap);

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 relative min-w-0 transition-colors duration-200">
      {activeConversation ? (
        <>
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/50 backdrop-blur-md relative z-10">
            <div className="flex items-center space-x-3 min-w-0">
              {/* Back Button (Mobile only) */}
              <button
                onClick={() => selectConversation(null)}
                className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mr-1"
              >
                <FiArrowLeft className="text-lg" />
              </button>

              <Avatar user={otherParticipant} size="md" showStatus={true} />
              
              <div className="min-w-0">
                <h2 className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">
                  @{otherParticipant?.username}
                </h2>
                {activeTypingUsernames.length > 0 ? (
                  <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-semibold animate-pulse">
                    {activeTypingUsernames.join(', ')} is typing...
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {otherParticipant?.isOnline ? 'Active now' : 'Offline'}
                  </p>
                )}
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-2 relative" ref={headerMenuRef}>
              <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Audio Call (Decorative)" onClick={()=>{handleComingSoon('audio call')}}>
                <FiPhone className="text-base" />
              </button>
              <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Video Call (Decorative)" onClick={()=>{handleComingSoon('video call')}}>
                <FiVideo className="text-base" />
              </button>

              {/* Options Menu Trigger */}
              <button
                onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                className={`p-2 rounded-lg transition-colors ${
                  headerMenuOpen 
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-950 dark:text-white' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Options"
              >
                <FiMoreVertical className="text-base" />
              </button>

              {/* Options Dropdown Menu */}
              <AnimatePresence>
                {headerMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 min-w-[170px] z-50 origin-top-right"
                  >
                    <button
                      onClick={handleClearChatClick}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold transition-colors text-left"
                    >
                      <FiTrash2 className="text-sm" />
                      Clear Chat for Me
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Messages Body */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-2 min-h-0 bg-slate-50/50 dark:bg-slate-950/20"
          >
            {/* Infinite Scroll Load Trigger */}
            {hasMoreMessages && (
              <div className="flex justify-center my-3">
                <button
                  onClick={fetchOlderMessages}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg transition-colors border border-slate-300 dark:border-slate-700/50 shadow-sm"
                >
                  Load older messages
                </button>
              </div>
            )}

            {loadingMessages ? (
                 <div className="space-y-4 py-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`flex items-start gap-3 max-w-[60%] ${n % 2 === 0 ? 'ml-auto flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-10 bg-slate-850 rounded-2xl animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Grouped Messages */
              Object.entries(groupedMessages).map(([dateStr, dateMsgs]) => (
                <div key={dateStr}>
                  {/* Date Separator */}
                  <div className="flex justify-center my-5">
                    <span className="bg-slate-200/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[10px] px-3 py-1 rounded-full font-bold shadow-sm select-none border border-slate-300 dark:border-slate-700/20">
                      {formatFullDate(dateStr)}
                    </span>
                  </div>
                  {dateMsgs.map((msg) => (
                    <div id={`msg-${msg._id}`} key={msg._id}>
                      <MessageBubble
                        msg={msg}
                        isOwn={msg.sender?._id === user?._id || msg.sender === user?._id}
                        currentUserId={user?._id}
                        onReply={handleReplyInitiate}
                        onEditInitiate={handleEditInitiate}
                        onDelete={deleteMessage}
                        onReact={addReaction}
                        onUnreact={removeReaction}
                      />
                    </div>
                  ))}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing status dots (if others are typing) */}
          {activeTypingUsernames.length > 0 && (
            <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/10 flex items-center gap-1.5 select-none shrink-0 border-t border-slate-200 dark:border-slate-900">
              <span className="font-medium">@{activeTypingUsernames[0]} is typing</span>
              <div className="flex gap-1 items-center h-3">
                <span className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full typing-dot" />
                <span className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full typing-dot" />
                <span className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full typing-dot" />
              </div>
            </div>
          )}

          {/* Footer Input Controls */}
          <div className="p-3 bg-white dark:bg-slate-900/60 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 relative z-10">
            {/* Reply Preview Bar */}
            {replyingMessage && (
              <div className="mb-3 p-3 bg-slate-100/90 dark:bg-slate-900/80 border-l-4 border-blue-500 rounded-lg flex items-center justify-between text-xs animate-slide-in">
                <div className="min-w-0 pr-4">
                  <p className="font-semibold text-blue-500 dark:text-blue-400 mb-0.5">
                    Replying to @{replyingMessage.sender?.username}
                  </p>
                  <p className="text-slate-650 dark:text-slate-300 truncate">
                    {replyingMessage.text?.startsWith('/uploads/') ? 'Attachment file' : replyingMessage.text}
                  </p>
                </div>
                <button
                  onClick={handleCancelReply}
                  className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <FiX />
                </button>
              </div>
            )}

            {/* Edit Indicator Bar */}
            {editingMessage && (
              <div className="mb-3 p-3 bg-slate-100/90 dark:bg-slate-900/80 border-l-4 border-amber-500 rounded-lg flex items-center justify-between text-xs">
                <div className="min-w-0 pr-4">
                  <p className="font-semibold text-amber-600 dark:text-amber-500 mb-0.5">Editing Message</p>
                  <p className="text-slate-650 dark:text-slate-300 truncate">{editingMessage.text}</p>
                </div>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <FiX />
                </button>
              </div>
            )}

            {/* Input form */}
            <form onSubmit={handleSend} className="flex items-center gap-2 relative">
              {/* Attachment trigger */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleFileClick}
                disabled={uploading}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50"
                title="Send File"
              >
                <FiPaperclip className="text-lg" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                placeholder={editingMessage ? 'Edit your message...' : 'Type a message...'}
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all font-medium"
              />

              {/* Emoji Trigger */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    showEmojiPicker 
                      ? 'text-blue-500 bg-slate-200 dark:bg-slate-800' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title="Choose Emoji"
                >
                  <FiSmile className="text-lg" />
                </button>

                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 z-50 mb-3 select-none">
                    <div
                      className="fixed inset-0"
                      onClick={() => setShowEmojiPicker(false)}
                    />
                    <div className="relative shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                      <EmojiPicker
                        onEmojiClick={(emojiData) => setInputText((prev) => prev + emojiData.emoji)}
                        theme={isDark ? 'dark' : 'light'}
                        lazyLoadEmojis={true}
                        skinTonesDisabled={true}
                        searchDisabled={false}
                        width={300}
                        height={350}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-slate-100 rounded-xl transition-all shadow-md shrink-0 disabled:shadow-none"
              >
                <FiSend className="text-lg" />
              </button>
            </form>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="w-20 h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex items-center justify-center shadow-lg dark:shadow-xl mb-4 text-blue-500 text-4xl">
            <LuMessageSquareText className="animate-bounce" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">QuickChat Messenger</h2>
          <p className="text-sm text-slate-500 dark:text-slate-500 max-w-sm">
            Select a conversation from the sidebar or search for a username to start a secure real-time chat.
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
