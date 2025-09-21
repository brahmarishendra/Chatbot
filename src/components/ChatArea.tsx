import React, { useState } from 'react';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import EmptyState from './EmptyState';
import VoiceInterface from './VoiceInterface';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';
import { Volume2, VolumeX } from 'lucide-react';

const ChatArea: React.FC = () => {
  const { currentSession, sendMessage } = useChat();
  const { theme } = useTheme();
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [showVoiceInterface, setShowVoiceInterface] = useState(false);

  const handleVoiceMessage = (message: string) => {
    if (message.trim()) {
      sendMessage(message);
    }
  };

  const handleVoiceToggle = (enabled: boolean) => {
    setIsVoiceEnabled(enabled);
    if (!enabled) {
      // Stop any current speech synthesis
      window.speechSynthesis?.cancel();
    }
  };

  // Listen for voice interface toggle events from ChatInput
  React.useEffect(() => {
    const handleToggleVoiceInterface = () => {
      setShowVoiceInterface(prev => !prev);
    };

    window.addEventListener('toggleVoiceInterface', handleToggleVoiceInterface);
    return () => {
      window.removeEventListener('toggleVoiceInterface', handleToggleVoiceInterface);
    };
  }, []);

  // Enhanced auto-speak AI responses when voice is enabled - Only when voice is explicitly enabled
  React.useEffect(() => {
    if (isVoiceEnabled && currentSession?.messages.length) {
      const lastMessage = currentSession.messages[currentSession.messages.length - 1];
      if (lastMessage.sender === 'bot' && lastMessage.timestamp) {
        const now = new Date().getTime();
        const messageTime = new Date(lastMessage.timestamp).getTime();
        
        // Only speak if message is recent (within 5 seconds) and voice is enabled
        if (now - messageTime < 5000) {
          console.log('🗣️ Auto-speaking AI response in voice mode:', lastMessage.content);
          
          // Clean emoji explanations from the response before speaking
          const cleanedResponse = cleanResponseForVoice(lastMessage.content);
          
          // Multiple attempts to ensure voice works
          const speakMessage = () => {
            // Try the global function first
            if ((window as any).mindBuddySpeakText && isVoiceEnabled) {
              console.log('✅ Using global mindBuddySpeakText function');
              (window as any).mindBuddySpeakText(cleanedResponse);
            } 
            // Fallback to direct speech synthesis
            else if (window.speechSynthesis && isVoiceEnabled) {
              console.log('✅ Using direct speechSynthesis fallback');
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(cleanedResponse);
              utterance.rate = 0.85;
              utterance.pitch = 1.1;
              utterance.volume = 0.9;
              utterance.lang = 'en-US';
              
              utterance.onstart = () => console.log('🎵 Direct voice playback started');
              utterance.onend = () => console.log('🎵 Direct voice playback ended');
              utterance.onerror = (error) => console.error('🚫 Direct voice error:', error);
              
              window.speechSynthesis.speak(utterance);
            } else {
              console.error('❌ No voice synthesis available');
            }
          };
          
          // Try immediately and with delay
          setTimeout(speakMessage, 100);
          setTimeout(speakMessage, 1000); // Backup attempt
        }
      }
    }
  }, [currentSession?.messages, isVoiceEnabled]);

  // Helper function to clean emoji explanations from responses
  const cleanResponseForVoice = (text: string): string => {
    // Remove emoji explanations and make responses more natural for voice
    let cleaned = text;
    
    // Remove emoji descriptions like "heart emoji", "blue heart emoji", etc.
    cleaned = cleaned.replace(/\b(heart emoji|blue heart emoji|rainbow emoji|seedling emoji|sleeping emoji|sos emoji|green heart emoji|purple heart emoji|orange heart emoji|yellow heart emoji)\b/gi, '');
    
    // Remove parenthetical emoji descriptions
    cleaned = cleaned.replace(/\([^)]*emoji[^)]*\)/gi, '');
    
    // Remove emoji-related phrases
    cleaned = cleaned.replace(/\b(with a|followed by a|plus a|and a)\s+(heart|rainbow|seedling|sleeping|sos)\s+emoji\b/gi, '');
    
    // Remove standalone emojis at the end of sentences or phrases
    cleaned = cleaned.replace(/\s+[💙🌈🌱😴🆘❤️💚💜🧡💛💯✨🎉🔥💪🙏👍]+\s*$/g, '');
    cleaned = cleaned.replace(/^[💙🌈🌱😴🆘❤️💚💜🧡💛💯✨🎉🔥💪🙏👍]+\s+/g, '');
    
    // Remove emojis from middle of text
    cleaned = cleaned.replace(/\s+[💙🌈🌱😴🆘❤️💚💜🧡💛💯✨🎉🔥💪🙏👍]+\s+/g, ' ');
    
    // Clean up extra spaces and punctuation
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\s+[.,!?]/g, (match) => match.trim());
    cleaned = cleaned.trim();
    
    // Remove empty sentences
    cleaned = cleaned.replace(/\.\s*\./g, '.');
    
    return cleaned;
  };

  return (
    <main className={`min-h-[calc(100vh-4rem)] transition-all duration-300 ${
      theme === 'light' ? 'bg-white text-black' : 'bg-gray-950 text-white'
    }`}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300">
        {currentSession ? (
          <div className="flex flex-col min-h-[calc(100vh-4rem)]">
            {/* Voice Status Indicator */}
            {isVoiceEnabled && (
              <div className="sticky top-20 z-20 mb-4">
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100/80 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-full backdrop-blur-sm">
                    <Volume2 className="w-3 h-3 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                      Voice Active
                    </span>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            <ChatMessages messages={currentSession.messages} />
            
            {/* Input Area */}
            <div className={`sticky bottom-0 backdrop-blur-xl py-4 transition-all duration-300 ${
              theme === 'light' ? 'bg-white/95' : 'bg-gray-950/95'
            }`}>
              <div className="space-y-4">
                {/* Voice Interface - Show when toggled from ChatInput */}
                {showVoiceInterface && (
                  <VoiceInterface
                    onSendVoiceMessage={handleVoiceMessage}
                    onToggleVoice={handleVoiceToggle}
                    isVoiceEnabled={isVoiceEnabled}
                    onClose={() => setShowVoiceInterface(false)}
                    showCloseButton={true}
                  />
                )}
                
                {/* Text Input */}
                <ChatInput />
              </div>
            </div>
          </div>
        ) : (
          <div className="min-h-[calc(100vh-4rem)] flex flex-col">
            <EmptyState />
            
            {/* Voice Interface for new conversations - Removed auto-show */}
          </div>
        )}
      </div>
    </main>
  );
};

export default ChatArea;