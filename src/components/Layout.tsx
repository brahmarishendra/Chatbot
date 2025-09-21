import React, { useState } from 'react';
import Header from './Header';
import ChatArea from './ChatArea';
import Sidebar from './Sidebar';
import GetStarted from './GetStarted';
import ProfileModal from './ProfileModal';
import SettingsModal from './SettingsModal';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(true);
  const { currentSession, createNewSession } = useChat();
  const { theme } = useTheme();

  const handleOpenVoiceInterface = () => {
    // Dispatch custom event to toggle voice interface in ChatArea
    const event = new CustomEvent('toggleVoiceInterface');
    window.dispatchEvent(event);
  };

  const handleGetStarted = () => {
    setShowGetStarted(false);
    createNewSession();
  };

  // Show GetStarted page if no session and showGetStarted is true
  if (showGetStarted && !currentSession) {
    return (
      <div className={`min-h-screen transition-all duration-300 ${theme === 'light' ? 'bg-white text-black' : 'bg-gray-950 text-white'}`}>
        <GetStarted onGetStarted={handleGetStarted} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${theme === 'light' ? 'bg-white text-black' : 'bg-gray-950 text-white'}`}>
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenVoiceInterface={handleOpenVoiceInterface}
      />
      
      {/* Main content */}
      <div className="transition-all duration-300 ease-in-out">
        <Header 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          hasSession={!!currentSession}
          isSidebarOpen={isSidebarOpen}
        />
        <ChatArea />
      </div>

      {/* Modals */}
      <ProfileModal 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default Layout;