import React from 'react';
import { Menu, Heart, User, Sun, Moon, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  hasSession: boolean;
  isSidebarOpen?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, hasSession, isSidebarOpen = false }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={`sticky top-0 z-30 backdrop-blur-xl border-b transition-all duration-300 ${
      theme === 'light' 
        ? 'bg-white/80 border-gray-200' 
        : 'bg-gray-950/80 border-gray-800'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleSidebar}
              className={`group p-2 rounded-xl transition-all duration-200 ${
                theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-gray-800'
              }`}
              title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {isSidebarOpen ? (
                <X className={`w-5 h-5 ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`} />
              ) : (
                <Menu className={`w-5 h-5 ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`} />
              )}
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center" style={{ borderRadius: '50px' }}>
                <img 
                  src="https://i.pinimg.com/736x/35/ed/de/35edde0e0c9e69638f9e70024db73530.jpg" 
                  alt="MindBuddy" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-lg font-semibold outfit-medium ${
                  theme === 'light' ? 'text-black' : 'text-white'
                }`}>
                  MindBuddy
                </h1>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-all duration-200 ${
                theme === 'light' 
                  ? 'text-gray-600 hover:text-black hover:bg-gray-100' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={onToggleSidebar}
              className={`hidden lg:flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                theme === 'light' 
                  ? 'text-gray-700 hover:text-black hover:bg-gray-100' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Menu className="w-4 h-4" />
              <span>History</span>
            </button>
            
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              theme === 'light' ? 'bg-gray-100' : 'bg-gray-800'
            }`}>
              <User className={`w-4 h-4 ${
                theme === 'light' ? 'text-gray-600' : 'text-gray-300'
              }`} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;