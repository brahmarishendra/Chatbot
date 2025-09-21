import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const TypingIndicator: React.FC = () => {
  const { theme } = useTheme();
  
  return (
    <div className="flex gap-4">
      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ borderRadius: '50px' }}>
        <img 
          src="https://i.pinimg.com/736x/35/ed/de/35edde0e0c9e69638f9e70024db73530.jpg" 
          alt="MindBuddy" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex items-center space-x-1 py-2">
        <div className={`w-2 h-2 rounded-full animate-bounce ${
          theme === 'light' ? 'bg-gray-400' : 'bg-gray-500'
        }`}></div>
        <div className={`w-2 h-2 rounded-full animate-bounce ${
          theme === 'light' ? 'bg-gray-400' : 'bg-gray-500'
        }`} style={{ animationDelay: '0.1s' }}></div>
        <div className={`w-2 h-2 rounded-full animate-bounce ${
          theme === 'light' ? 'bg-gray-400' : 'bg-gray-500'
        }`} style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );
};

export default TypingIndicator;