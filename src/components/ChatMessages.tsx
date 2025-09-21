import React, { useEffect, useRef } from 'react';
import { Heart, User, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Message } from '../contexts/ChatContext';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';
import TypingIndicator from './TypingIndicator';

interface ChatMessagesProps {
  messages: Message[];
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isTyping } = useChat();
  const { theme } = useTheme();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex-1 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {messages.map((message, index) => (
          <div key={message.id} className="space-y-4">
            {message.sender === 'user' ? (
              <div className="flex gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
                }`}>
                  <User className={`w-4 h-4 ${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className={`text-base leading-relaxed outfit-regular ${
                    theme === 'light' ? 'text-black' : 'text-white'
                  }`}>{message.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ borderRadius: '50px' }}>
                  <img 
                    src="https://i.pinimg.com/736x/35/ed/de/35edde0e0c9e69638f9e70024db73530.jpg" 
                    alt="MindBuddy" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div className={`prose max-w-none ${
                    theme === 'light' ? 'prose-gray' : 'prose-invert'
                  }`}>
                    <p className={`text-base leading-relaxed whitespace-pre-wrap outfit-regular ${
                      theme === 'light' ? 'text-black' : 'text-gray-200'
                    }`}>
                      {message.content}
                    </p>
                  </div>
                  
                  {/* Message actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(message.content)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        theme === 'light' 
                          ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100' 
                          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                      }`}
                      title="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-1.5 rounded-lg transition-colors ${
                        theme === 'light' 
                          ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100' 
                          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                      }`}
                      title="Good response"
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-1.5 rounded-lg transition-colors ${
                        theme === 'light' 
                          ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100' 
                          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                      }`}
                      title="Poor response"
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatMessages;