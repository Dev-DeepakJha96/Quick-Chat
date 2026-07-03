import React, { useState, useRef, useEffect } from 'react';

const MessageInput = ({ onSend, onTyping, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Handle sending message
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      
      // Notify typing stopped
      if (onTyping) {
        onTyping(false);
      }
    }
  };

  // Handle key down (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle typing
  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Notify typing status
    if (onTyping) {
      const isTyping = value.trim().length > 0;
      onTyping(isTyping);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing after 2 seconds of inactivity
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000);
      }
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="bg-white border-t p-4">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={disabled ? 'Connecting...' : 'Type a message...'}
            disabled={disabled}
            rows={1}
            className={`
              w-full px-4 py-3 rounded-2xl resize-none
              border-2 transition-all duration-200
              ${isFocused 
                ? 'border-primary-500 bg-white' 
                : 'border-gray-200 bg-gray-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              focus:outline-none focus:ring-2 focus:ring-primary-500/20
              placeholder:text-gray-400
            `}
            style={{
              minHeight: '52px',
              maxHeight: '150px',
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
            }}
          />
          
          {/* Character count */}
          {message.length > 0 && (
            <div className={`absolute bottom-2 right-3 text-xs ${message.length > 4500 ? 'text-red-500' : 'text-gray-400'}`}>
              {message.length}/5000
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className={`
            p-3 rounded-full transition-all duration-200 flex-shrink-0
            ${message.trim() && !disabled
              ? 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95 shadow-md hover:shadow-lg' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
          title="Send message"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="text-center mt-2">
        <span className="text-xs text-gray-400">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs border border-gray-300">Enter</kbd> to send,{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs border border-gray-300">Shift + Enter</kbd> for new line
        </span>
      </div>
    </div>
  );
};

export default MessageInput;