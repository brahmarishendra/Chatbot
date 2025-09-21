import React, { useState } from 'react';
import { Send, Mic, ArrowUp, Heart, AlertCircle, Phone } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';
import { aiService } from '../services/aiService';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
];

const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [showLanguages, setShowLanguages] = useState(false);
  const [showMentalHealthQuickActions, setShowMentalHealthQuickActions] = useState(false);
  const { sendMessage, selectedLanguage, setSelectedLanguage, isTyping, currentSession } = useChat();
  const { theme } = useTheme();

  // Get voice interface functions from parent (ChatArea)
  const toggleVoiceInterface = () => {
    // Dispatch custom event to toggle voice interface
    window.dispatchEvent(new CustomEvent('toggleVoiceInterface'));
  };

  // Mental health quick action prompts
  const mentalHealthPrompts = [
    { icon: Heart, text: "I'm feeling anxious", prompt: "I'm feeling anxious and could use some support and coping strategies." },
    { icon: AlertCircle, text: "I'm stressed", prompt: "I'm feeling overwhelmed with stress and need help managing it." },
    { icon: Phone, text: "Need someone to talk to", prompt: "I need someone to talk to about what I'm going through right now." },
    { icon: Heart, text: "Feeling down", prompt: "I've been feeling down lately and could use some encouragement and guidance." },
  ];

  const connectionStatus = aiService.isLangGraphConnected();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isTyping) {
      await sendMessage(message.trim());
      setMessage('');
    }
  };

  const handleQuickAction = async (prompt: string) => {
    if (!isTyping) {
      setMessage(prompt);
      await sendMessage(prompt);
      setMessage('');
      setShowMentalHealthQuickActions(false);
    }
  };

  const selectedLang = languages.find(lang => lang.code === selectedLanguage) || languages[0];

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Connection Status Indicator */}
      <div className="flex items-center justify-center mb-2">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
          connectionStatus 
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
            : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus ? 'bg-green-500' : 'bg-orange-500'
          }`} />
          <span>
            {connectionStatus ? '🤗 MindBuddy is ready to help' : '⚠️ Using fallback mode'}
          </span>
        </div>
      </div>

      {/* Mental Health Quick Actions */}
      {showMentalHealthQuickActions && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Quick Mental Health Support
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {mentalHealthPrompts.map((prompt, index) => {
              const IconComponent = prompt.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleQuickAction(prompt.prompt)}
                  disabled={isTyping}
                  className="flex items-center gap-2 p-3 text-left bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{prompt.text}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setShowMentalHealthQuickActions(false)}
            className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Hide quick actions
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 overflow-hidden focus-within:border-gray-400 dark:focus-within:border-gray-600 transition-colors duration-300" style={{ borderRadius: '1px' }}>
          {/* Input area */}
          <div className="flex items-end gap-3 p-4">
            <div className="flex-1">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={currentSession ? "Share what's on your mind..." : "Tell me how you're feeling..."}
                className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none border-0 outline-none text-base leading-6 max-h-32 transition-colors duration-300 outfit-regular"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={isTyping}
                style={{
                  minHeight: '24px',
                  height: 'auto'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
            </div>
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-4 pb-4">
            <div className="flex items-center gap-2">
              {/* Mental Health Quick Actions Button - Keep this */}
              <button
                type="button"
                onClick={() => setShowMentalHealthQuickActions(!showMentalHealthQuickActions)}
                className={`p-2 rounded-lg transition-colors duration-300 ${
                  showMentalHealthQuickActions
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                title="Mental Health Quick Actions"
              >
                <Heart className="w-4 h-4" />
              </button>
              
              {/* Voice Interface Toggle - Keep this */}
              <button
                type="button"
                onClick={toggleVoiceInterface}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors duration-300"
                title="Toggle Voice Interface"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            
            <button
              type="submit"
              disabled={!message.trim() || isTyping}
              className="p-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Language indicator with mental wellness context */}
        <div className="flex items-center justify-center mt-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{selectedLang.flag}</span>
            <span>MindBuddy responding in {selectedLang.name}</span>
            {!connectionStatus && (
              <span className="text-orange-600 dark:text-orange-400">• Limited mode</span>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;