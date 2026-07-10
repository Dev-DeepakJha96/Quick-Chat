import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { chatService } from '../services/chat';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextBefore, setNextBefore] = useState(null);
  
  // Typing indicators: { [conversationId]: { [userId]: username } }
  const [typingUsers, setTypingUsers] = useState({});
  // Online users map: { [userId]: { isOnline, username, avatarColor } }
  const [onlineUsers, setOnlineUsers] = useState({});

  const activeConversationRef = useRef(activeConversation);
  
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Fetch initial conversations
  const fetchConversations = async () => {
    if (!user) return;
    setLoadingConversations(true);
    try {
      const response = await chatService.getConversations(50, 0);
      if (response.success && response.data?.conversations) {
        setConversations(response.data.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load chats.');
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Setup Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Handle incoming messages
    socket.on('message:receive', ({ message, conversationId }) => {
      // 1. If it belongs to active conversation, append it
      const currentActive = activeConversationRef.current;
      if (currentActive && currentActive._id === conversationId) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        
        // Mark as read in server
        socket.emit('message:read', {
          conversationId,
          messageId: message._id,
        });
        
        // Mark as read in backend database
        chatService.markAsRead(conversationId).catch(console.error);
      }

      // 2. Update last message in the conversations list
      setConversations((prev) => {
        const isCurrentlyActive = currentActive && currentActive._id === conversationId;
        const updated = prev.map((conv) => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              lastMessage: message,
              lastMessageAt: message.createdAt,
              unreadCount: isCurrentlyActive ? 0 : (conv.unreadCount || 0) + 1,
            };
          }
          return conv;
        });

        // Bubble the active/updated conversation to the top
        const targetIndex = updated.findIndex((c) => c._id === conversationId);
        if (targetIndex > -1) {
          const [target] = updated.splice(targetIndex, 1);
          return [target, ...updated];
        }
        
        // If conversation is not in list, reload conversations
        fetchConversations();
        return updated;
      });
    });

    // Handle message edits
    socket.on('message:edited', ({ message, conversationId }) => {
      const currentActive = activeConversationRef.current;
      if (currentActive && currentActive._id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === message._id ? message : msg))
        );
      }

      // Update in conversations list if it was the last message
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv._id === conversationId && conv.lastMessage?._id === message._id) {
            return { ...conv, lastMessage: message };
          }
          return conv;
        })
      );
    });

    // Handle reactions
    socket.on('message:reacted', ({ messageId, reactions, conversationId }) => {
      const currentActive = activeConversationRef.current;
      if (currentActive && currentActive._id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg))
        );
      }
    });

    // Handle typing status updates
    socket.on('typing:indicator', ({ conversationId, userId, username, isTyping }) => {
      // Don't show typing indicator for oneself
      if (userId === user?._id) return;
      
      setTypingUsers((prev) => {
        const convTyping = { ...(prev[conversationId] || {}) };
        if (isTyping) {
          convTyping[userId] = username;
        } else {
          delete convTyping[userId];
        }
        return { ...prev, [conversationId]: convTyping };
      });
    });

    // Handle read receipt updates
    socket.on('message:readReceipt', ({ conversationId, messageId, readBy, readAt }) => {
      const currentActive = activeConversationRef.current;
      if (currentActive && currentActive._id === conversationId) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg._id === messageId) {
              const alreadyRead = msg.readBy?.some((r) => r.user?._id === readBy || r.user === readBy);
              if (alreadyRead) return msg;
              return {
                ...msg,
                readBy: [...(msg.readBy || []), { user: readBy, readAt }],
              };
            }
            return msg;
          })
        );
      }
    });

    // Handle user status changes (online/offline)
    socket.on('user:status', ({ userId, username, avatarColor, isOnline }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [userId]: { isOnline, username, avatarColor },
      }));

      // Update isOnline in participants of loaded conversations
      setConversations((prev) =>
        prev.map((conv) => {
          const updatedParticipants = conv.participants.map((part) => {
            if (part._id === userId) {
              return { ...part, isOnline, lastSeen: new Date() };
            }
            return part;
          });
          return { ...conv, participants: updatedParticipants };
        })
      );

      // Update active conversation participants too
      const currentActive = activeConversationRef.current;
      if (currentActive) {
        const updatedParticipants = currentActive.participants.map((part) => {
          if (part._id === userId) {
            return { ...part, isOnline, lastSeen: new Date() };
          }
          return part;
        });
        if (JSON.stringify(currentActive.participants) !== JSON.stringify(updatedParticipants)) {
          setActiveConversation({ ...currentActive, participants: updatedParticipants });
        }
      }
    });

    // When we connect, the server automatically emits 'conversations:joined'
    socket.on('conversations:joined', ({ conversationIds }) => {
      console.log('Joined rooms:', conversationIds);
    });

    return () => {
      socket.off('message:receive');
      socket.off('message:edited');
      socket.off('message:reacted');
      socket.off('typing:indicator');
      socket.off('message:readReceipt');
      socket.off('user:status');
      socket.off('conversations:joined');
    };
  }, [socket, user]);

  // Select a conversation
  const selectConversation = async (conversation) => {
    if (!conversation) {
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    setActiveConversation(conversation);
    setLoadingMessages(true);
    
    // Clear unread count locally
    setConversations((prev) =>
      prev.map((conv) =>
        conv._id === conversation._id ? { ...conv, unreadCount: 0 } : conv
      )
    );

    try {
      const response = await chatService.getMessages(conversation._id, 50);
      if (response.success && response.data?.messages) {
        // The messages are returned newest first (sorted descending by createdAt).
        // Let's reverse them to show in chronological order in the chat window.
        setMessages(response.data.messages.reverse());
        setHasMoreMessages(response.data.pagination.hasMore);
        setNextBefore(response.data.pagination.nextBefore);

        // Mark all messages as read
        if (response.data.messages.length > 0) {
          const lastMsg = response.data.messages[response.data.messages.length - 1];
          if (socket && lastMsg.sender?._id !== user?._id) {
            socket.emit('message:read', {
              conversationId: conversation._id,
              messageId: lastMsg._id,
            });
          }
        }
        await chatService.markAsRead(conversation._id);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages.');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Fetch older messages (for infinite scroll)
  const fetchOlderMessages = async () => {
    if (!activeConversation || !hasMoreMessages || !nextBefore) return;

    try {
      const response = await chatService.getMessages(activeConversation._id, 30, nextBefore);
      if (response.success && response.data?.messages) {
        const older = response.data.messages.reverse();
        setMessages((prev) => [...older, ...prev]);
        setHasMoreMessages(response.data.pagination.hasMore);
        setNextBefore(response.data.pagination.nextBefore);
      }
    } catch (error) {
      console.error('Error fetching older messages:', error);
    }
  };

  // Send a message
  const sendMessage = async (conversationId, text, replyToId = null) => {
    if (!conversationId) return;

    return new Promise((resolve, reject) => {
      if (socket && connected) {
        socket.emit(
          'message:send',
          {
            conversationId,
            text,
            replyTo: replyToId,
          },
          (response) => {
            if (response.success) {
              setMessages((prev) => {
                if (prev.some((m) => m._id === response.message._id)) return prev;
                return [...prev, response.message];
              });
              resolve(response.message);
            } else {
              toast.error(response.error || 'Failed to send message.');
              reject(new Error(response.error));
            }
          }
        );
      } else {
        // Fallback to HTTP
        chatService
          .sendMessage(conversationId, text, replyToId)
          .then((response) => {
            if (response.success && response.data?.message) {
              setMessages((prev) => [...prev, response.data.message]);
              resolve(response.data.message);
            } else {
              reject(new Error('Failed to send'));
            }
          })
          .catch((err) => {
            toast.error(err.message || 'Failed to send message.');
            reject(err);
          });
      }
    });
  };

  // Edit message
  const editMessage = async (messageId, newText) => {
    return new Promise((resolve, reject) => {
      if (socket && connected) {
        socket.emit(
          'message:edit',
          { messageId, text: newText },
          (response) => {
            if (response.success) {
              resolve(response.message);
            } else {
              toast.error(response.error || 'Failed to edit message.');
              reject(new Error(response.error));
            }
          }
        );
      } else {
        chatService
          .editMessage(messageId, newText)
          .then((response) => {
            if (response.success && response.data?.message) {
              setMessages((prev) =>
                prev.map((msg) => (msg._id === messageId ? response.data.message : msg))
              );
              resolve(response.data.message);
            } else {
              reject(new Error('Failed to edit'));
            }
          })
          .catch((err) => {
            toast.error(err.message || 'Failed to edit message.');
            reject(err);
          });
      }
    });
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    try {
      const response = await chatService.deleteMessage(messageId);
      if (response.success) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId ? { ...msg, text: 'This message was deleted', isDeleted: true } : msg
          )
        );
        toast.success('Message deleted');
        return true;
      }
      return false;
    } catch (error) {
      toast.error(error.message || 'Failed to delete message.');
      return false;
    }
  };

  // Clear chat history for the current user
  const clearChatHistory = async (conversationId) => {
    try {
      const response = await chatService.clearChat(conversationId);
      if (response.success) {
        if (activeConversation && activeConversation._id === conversationId) {
          setMessages([]);
        }

        setConversations((prev) =>
          prev.map((conv) => {
            if (conv._id === conversationId) {
              return {
                ...conv,
                lastMessage: null,
                unreadCount: 0,
              };
            }
            return conv;
          })
        );

        toast.success('Chat cleared successfully!');
        return true;
      }
      return false;
    } catch (error) {
      toast.error(error.message || 'Failed to clear chat.');
      return false;
    }
  };

  // Delete the entire conversation for the current user
  const deleteConversationHistory = async (conversationId) => {
    try {
      const response = await chatService.deleteConversation(conversationId);
      if (response.success) {
        if (activeConversation && activeConversation._id === conversationId) {
          selectConversation(null);
        }

        setConversations((prev) =>
          prev.filter((conv) => conv._id !== conversationId)
        );

        toast.success('Conversation deleted successfully!');
        return true;
      }
      return false;
    } catch (error) {
      toast.error(error.message || 'Failed to delete conversation.');
      return false;
    }
  };

  // Add Reaction
  const addReaction = async (messageId, emoji) => {
    return new Promise((resolve, reject) => {
      if (socket && connected) {
        socket.emit(
          'message:react',
          { messageId, emoji },
          (response) => {
            if (response.success) {
              resolve(response.reactions);
            } else {
              reject(new Error(response.error));
            }
          }
        );
      } else {
        chatService
          .addReaction(messageId, emoji)
          .then((response) => {
            if (response.success) {
              resolve(response.data.reactions);
            } else {
              reject(new Error('Failed to react'));
            }
          })
          .catch(reject);
      }
    });
  };

  // Remove Reaction
  const removeReaction = async (messageId, emoji) => {
    return new Promise((resolve, reject) => {
      if (socket && connected) {
        socket.emit(
          'message:unreact',
          { messageId, emoji },
          (response) => {
            if (response.success) {
              resolve(response.reactions);
            } else {
              reject(new Error(response.error));
            }
          }
        );
      } else {
        chatService
          .removeReaction(messageId, emoji)
          .then((response) => {
            if (response.success) {
              resolve(response.data.reactions);
            } else {
              reject(new Error('Failed to remove reaction'));
            }
          })
          .catch(reject);
      }
    });
  };

  // Start Typing
  const startTyping = () => {
    if (socket && connected && activeConversation) {
      socket.emit('typing:start', { conversationId: activeConversation._id });
    }
  };

  // Stop Typing
  const stopTyping = () => {
    if (socket && connected && activeConversation) {
      socket.emit('typing:stop', { conversationId: activeConversation._id });
    }
  };

  // Create a new conversation by user ID
  const startNewChat = async (participantId) => {
    try {
      const response = await chatService.createConversation(participantId);
      if (response.success && response.data?.conversation) {
        const conv = response.data.conversation;
        
        // Add to local list if not present
        setConversations((prev) => {
          if (prev.some((c) => c._id === conv._id)) return prev;
          return [conv, ...prev];
        });

        selectConversation(conv);
        return conv;
      }
    } catch (error) {
      console.error('Error starting new chat:', error);
      toast.error('Failed to open chat.');
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        loadingConversations,
        loadingMessages,
        hasMoreMessages,
        typingUsers,
        onlineUsers,
        selectConversation,
        fetchOlderMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        clearChatHistory,
        deleteConversationHistory,
        addReaction,
        removeReaction,
        startTyping,
        stopTyping,
        startNewChat,
        fetchConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
