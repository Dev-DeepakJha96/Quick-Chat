import React from 'react';
import Sidebar from '../../components/Sidebar';
import ChatWindow from '../../components/Chat';
import { useChat } from '../../context/ChatContext';

const Home = () => {
  const { activeConversation, selectConversation } = useChat();

  return (
    <div className="h-dvh w-screen flex bg-slate-950 overflow-hidden text-slate-100 font-sans relative">
      {/* Sidebar container (30% desktop, full screen mobile if no active conversation) */}
      <div
        className={`h-full border-r border-slate-800/50 shrink-0 w-full md:w-[320px] lg:w-[380px] transition-all duration-300 ${
          activeConversation ? 'hidden md:flex flex-col' : 'flex flex-col'
        }`}
      >
        <Sidebar onMobileClose={() => {}} />
      </div>

      {/* Chat window container (70% desktop, full screen mobile if active conversation) */}
      <div
        className={`h-full flex-1 min-w-0 transition-all duration-300 ${
          activeConversation ? 'flex flex-col' : 'hidden md:flex flex-col'
        }`}
      >
        <ChatWindow />
      </div>
    </div>
  );
};

export default Home;
