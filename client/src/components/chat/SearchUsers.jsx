import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../common/LoadingSpinner';

const SearchUsers = () => {
  const { user } = useAuth();
  const { searchUsers: searchUsersApi, searchResults, searching, createConversation } = useChat();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchTimeoutRef = useRef(null);

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      searchUsersApi(debouncedQuery.trim());
    }
  }, [debouncedQuery, searchUsersApi]);

  // Handle starting conversation
  const handleStartConversation = async (participant) => {
    await createConversation(participant._id);
    setQuery('');
    setDebouncedQuery('');
  };

  // Get avatar color
  const getAvatarColor = (participant) => {
    return participant?.avatarColor || '#6366f1';
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by username or email..."
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div className="absolute left-3 top-2.5 text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {searching && (
          <div className="absolute right-3 top-2.5">
            <LoadingSpinner size="small" />
          </div>
        )}
      </div>

      {/* Search Results */}
      {query.length >= 2 && (
        <div className="max-h-60 overflow-y-auto space-y-1">
          {searching ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No users found
            </p>
          ) : (
            searchResults.map((participant) => (
              <div
                key={participant._id}
                onClick={() => handleStartConversation(participant)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: getAvatarColor(participant) }}
                >
                  {participant.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {participant.username}
                  </div>
                  <div className="text-sm text-gray-500">
                    {participant.email}
                  </div>
                </div>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Chat
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Hint */}
      {query.length === 0 && (
        <p className="text-xs text-gray-400 text-center">
          Search by username or email to find people to chat with
        </p>
      )}
    </div>
  );
};

export default SearchUsers;