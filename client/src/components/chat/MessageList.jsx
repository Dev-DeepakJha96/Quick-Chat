import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';

const MessageList = () => {
  const { user } = useAuth();
  const { messages, loadingMore, hasMoreMessages, loadMoreMessages, messagesEndRef } = useChat();
  const scrollContainerRef = useRef(null);
  const isFirstLoad = useRef(true);
  const prevMessagesLength = useRef(0);

  // Handle scroll to load more messages
  const handleScroll = (e) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && hasMoreMessages && !loadingMore) {
      // Save current scroll position before loading
      const currentScrollHeight = e.currentTarget.scrollHeight;
      loadMoreMessages().then(() => {
        // Restore scroll position after loading
        const newScrollHeight = e.currentTarget.scrollHeight;
        e.currentTarget.scrollTop = newScrollHeight - currentScrollHeight;
      });
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      // New message added
      const lastMessage = messages[messages.length - 1];
      // Only auto-scroll if new message is from current user or we're already at bottom
      if (lastMessage?.sender?._id === user._id || isAtBottom()) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  // Check if scroll is at bottom
  const isAtBottom = () => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    return scrollHeight - scrollTop <= clientHeight + 50;
  };

  // Format message time
  const formatMessageTime = (date) => {
    return format(new Date(date), 'h:mm a');
  };

  // Format message date
  const formatMessageDate = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateObj = new Date(date);
    if (dateObj.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (dateObj.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return format(dateObj, 'MMMM d, yyyy');
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(message => {
      const date = new Date(message.createdAt);
      const dateKey = date.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: date,
          messages: []
        };
      }
      groups[dateKey].messages.push(message);
    });
    return Object.values(groups);
  };

  const messageGroups = groupMessagesByDate();

  // Check if message is from current user
  const isOwnMessage = (message) => {
    return message.sender?._id === user._id;
  };

  // Get message status
  const getMessageStatus = (message) => {
    if (message.isTemp) {
      return 'sending';
    }
    if (message.readBy?.length > 0) {
      return 'read';
    }
    if (message.deliveredTo?.length > 0) {
      return 'delivered';
    }
    return 'sent';
  };

  // Render message status icon
  const renderStatusIcon = (message) => {
    const status = getMessageStatus(message);
    if (message.isTemp) {
      return (
        <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-primary-500 rounded-full animate-spin" />
      );
    }
    switch (status) {
      case 'read':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'delivered':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
    >
      {/* Loading indicator for older messages */}
      {loadingMore && (
        <div className="text-center py-2">
          <span className="text-sm text-gray-400">Loading older messages...</span>
        </div>
      )}

      {messageGroups.map((group) => (
        <div key={group.dateKey} className="space-y-4">
          {/* Date separator */}
          <div className="flex justify-center">
            <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">
              {formatMessageDate(group.date)}
            </span>
          </div>

          {group.messages.map((message) => {
            const isOwn = isOwnMessage(message);
            const isDeleted = message.isDeleted;

            if (isDeleted) {
              return (
                <div key={message._id} className="flex justify-center">
                  <span className="text-xs text-gray-400 italic">
                    This message was deleted
                  </span>
                </div>
              );
            }

            return (
              <div
                key={message._id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`max-w-[70%] ${!isOwn ? 'pr-12' : 'pl-12'}`}>
                  {!isOwn && (
                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                      <span className="font-medium">{message.sender?.username}</span>
                    </div>
                  )}
                  <div
                    className={`
                      rounded-2xl px-4 py-2.5 relative
                      ${isOwn 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-white border border-gray-200 text-gray-900'
                      }
                      ${message.isTemp ? 'opacity-70' : ''}
                      shadow-sm
                    `}
                  >
                    <p className="text-sm break-words whitespace-pre-wrap">
                      {message.text}
                    </p>
                    <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${isOwn ? 'text-white/80' : 'text-gray-400'}`}>
                      <span>{formatMessageTime(message.createdAt)}</span>
                      {isOwn && (
                        <span className="ml-1">
                          {renderStatusIcon(message)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Empty state */}
      {messages.length === 0 && !loadingMore && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-center">No messages yet</p>
          <p className="text-sm text-center mt-1">
            Send a message to start the conversation
          </p>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;