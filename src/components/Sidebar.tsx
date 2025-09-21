import React from 'react';
import { Mic, History, Plus, User, X, Settings, Trash2, Edit2, Check, MoreHorizontal } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenVoiceInterface?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onOpenProfile, onOpenSettings, onOpenVoiceInterface }) => {
  const { sessions, currentSession, createNewSession, selectSession, deleteSession, renameSession, clearAllHistory } = useChat();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [editingSessionId, setEditingSessionId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [showDropdown, setShowDropdown] = React.useState<string | null>(null);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleVoiceClick = () => {
    if (onOpenVoiceInterface) {
      onOpenVoiceInterface();
      onClose(); // Close sidebar when opening voice interface
    }
  };

  const handleRenameStart = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId);
    setEditTitle(currentTitle);
    setShowDropdown(null);
  };

  const handleRenameSubmit = (sessionId: string) => {
    if (editTitle.trim()) {
      renameSession(sessionId, editTitle.trim());
    }
    setEditingSessionId(null);
    setEditTitle('');
  };

  const handleRenameCancel = () => {
    setEditingSessionId(null);
    setEditTitle('');
  };

  const handleDelete = (sessionId: string) => {
    deleteSession(sessionId);
    setShowDropdown(null);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(null);
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <>


      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-80 flex flex-col
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${
          theme === 'light' 
            ? 'bg-gray-50 border-r border-gray-200' 
            : 'bg-gray-900 border-r border-gray-800'
        }
      `}>
        {/* Header with Logo */}
        <div className={`p-4 border-b ${
          theme === 'light' ? 'border-gray-200' : 'border-gray-800'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center" style={{ borderRadius: '50px' }}>
                <img 
                  src="https://i.pinimg.com/736x/35/ed/de/35edde0e0c9e69638f9e70024db73530.jpg" 
                  alt="MindBuddy" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className={`text-lg font-medium outfit-medium ${
                  theme === 'light' ? 'text-black' : 'text-white'
                }`}>
                  MindBuddy
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded outfit-regular ${
                theme === 'light' 
                  ? 'text-gray-700 bg-gray-200' 
                  : 'text-gray-400 bg-gray-800'
              }`}>Private</span>
              <button
                onClick={onClose}
                className={`p-1 transition-colors ${
                  theme === 'light' 
                    ? 'text-gray-600 hover:text-black' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* New Chat Button */}
          <button
            onClick={() => {
              createNewSession();
              onClose();
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
              theme === 'light'
                ? 'text-black bg-gray-200 hover:bg-gray-300'
                : 'text-white bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm outfit-medium">New Chat</span>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 p-4">
          <div className="space-y-2">
            {/* Voice */}
            <div 
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                theme === 'light'
                  ? 'text-gray-700 hover:text-black hover:bg-gray-200'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
              onClick={handleVoiceClick}
            >
              <Mic className="w-4 h-4" />
              <span className="text-sm outfit-regular">Voice</span>
            </div>
            
            {/* History */}
            <div className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
              theme === 'light'
                ? 'text-gray-700 hover:text-black hover:bg-gray-200'
                : 'text-gray-300 hover:text-white hover:bg-gray-800'
            }`}>
              <History className="w-4 h-4" />
              <span className="text-sm outfit-regular">History</span>
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="mt-8">
            <h3 className={`text-xs uppercase tracking-wider mb-3 outfit-medium ${
              theme === 'light' ? 'text-gray-600' : 'text-gray-400'
            }`}>
              Recent
            </h3>
            <div className="space-y-1">
              {sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className={`
                    group relative p-2 text-sm rounded cursor-pointer transition-colors outfit-regular
                    ${
                      currentSession?.id === session.id 
                        ? (theme === 'light' ? 'bg-gray-200 text-black' : 'bg-gray-800 text-white')
                        : (theme === 'light' 
                            ? 'text-gray-700 hover:text-black hover:bg-gray-200' 
                            : 'text-gray-300 hover:text-white hover:bg-gray-800'
                          )
                    }
                  `}
                >
                  {editingSessionId === session.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(session.id);
                          if (e.key === 'Escape') handleRenameCancel();
                        }}
                        className={`flex-1 bg-transparent border rounded px-2 py-1 text-xs outline-none ${
                          theme === 'light' 
                            ? 'border-gray-300 text-black' 
                            : 'border-gray-600 text-white'
                        }`}
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameSubmit(session.id)}
                        className={`p-1 rounded hover:bg-opacity-80 ${
                          theme === 'light' ? 'text-green-600 hover:bg-green-100' : 'text-green-400 hover:bg-green-900'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleRenameCancel}
                        className={`p-1 rounded hover:bg-opacity-80 ${
                          theme === 'light' ? 'text-red-600 hover:bg-red-100' : 'text-red-400 hover:bg-red-900'
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 truncate pr-2"
                        onClick={() => {
                          selectSession(session.id);
                          onClose();
                        }}
                      >
                        {session.title}
                      </div>
                      
                      {/* Options dropdown */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(showDropdown === session.id ? null : session.id);
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                            theme === 'light' 
                              ? 'hover:bg-gray-300 text-gray-600' 
                              : 'hover:bg-gray-700 text-gray-400'
                          }`}
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </button>
                        
                        {showDropdown === session.id && (
                          <div className={`absolute right-0 top-6 w-32 rounded-lg shadow-lg border z-50 ${
                            theme === 'light' 
                              ? 'bg-white border-gray-200' 
                              : 'bg-gray-800 border-gray-700'
                          }`}>
                            <button
                              onClick={() => handleRenameStart(session.id, session.title)}
                              className={`w-full px-3 py-2 text-left text-xs rounded-t-lg transition-colors flex items-center gap-2 ${
                                theme === 'light' 
                                  ? 'text-gray-700 hover:bg-gray-100' 
                                  : 'text-gray-300 hover:bg-gray-700'
                              }`}
                            >
                              <Edit2 className="w-3 h-3" />
                              Rename
                            </button>
                            <button
                              onClick={() => handleDelete(session.id)}
                              className={`w-full px-3 py-2 text-left text-xs rounded-b-lg transition-colors flex items-center gap-2 ${
                                theme === 'light' 
                                  ? 'text-red-600 hover:bg-red-50' 
                                  : 'text-red-400 hover:bg-red-900/20'
                              }`}
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${
          theme === 'light' ? 'border-gray-200' : 'border-gray-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'
            }`}>
              <User className={`w-4 h-4 ${
                theme === 'light' ? 'text-gray-700' : 'text-gray-300'
              }`} />
            </div>
            <div className="flex-1">
              <p className={`text-sm outfit-medium ${
                theme === 'light' ? 'text-black' : 'text-white'
              }`}>
                {user?.name || 'Guest User'}
              </p>
            </div>
            <button
              onClick={onOpenSettings}
              className={`p-1 transition-colors ${
                theme === 'light' 
                  ? 'text-gray-600 hover:text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;