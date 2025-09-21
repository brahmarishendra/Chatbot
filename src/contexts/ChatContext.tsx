import React, { createContext, useContext, useState, useEffect } from 'react';
import { aiService } from '../services/aiService';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  language?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastActive: Date;
}

interface ChatContextType {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  isTyping: boolean;
  selectedLanguage: string;
  createNewSession: () => void;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newTitle: string) => void;
  clearAllHistory: () => void;
  sendMessage: (content: string) => Promise<void>;
  setSelectedLanguage: (language: string) => void;
  isAgentConnected: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isAgentConnected, setIsAgentConnected] = useState(false);

  // Check agent connection status periodically
  useEffect(() => {
    const checkConnection = () => {
      setIsAgentConnected(aiService.isLangGraphConnected());
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('chatSessions');
    if (saved) {
      const parsedSessions = JSON.parse(saved).map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        lastActive: new Date(session.lastActive),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      setSessions(parsedSessions);
      if (parsedSessions.length > 0) {
        setCurrentSession(parsedSessions[0]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chatSessions', JSON.stringify(sessions));
  }, [sessions]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Mental Wellness Chat',
      messages: [{
        id: 'welcome-' + Date.now(),
        content: "Hi! I'm MindBuddy, your compassionate mental wellness companion. I'm here to support you with anxiety, stress, mood concerns, and other mental health challenges. How are you feeling today? 💙",
        sender: 'bot',
        timestamp: new Date(),
        language: selectedLanguage
      }],
      createdAt: new Date(),
      lastActive: new Date()
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSession(newSession);
  };

  const selectSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
    }
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      setCurrentSession(remainingSessions.length > 0 ? remainingSessions[0] : null);
    }
  };

  const renameSession = (sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId ? { ...session, title: newTitle.trim() } : session
    ));
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, title: newTitle.trim() } : null);
    }
  };

  const clearAllHistory = () => {
    setSessions([]);
    setCurrentSession(null);
  };

  const sendMessage = async (content: string) => {
    if (!currentSession) {
      // Create a new session if none exists
      createNewSession();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      language: selectedLanguage
    };

    // Update current session with user message
    const updatedSession = {
      ...currentSession,
      messages: [...currentSession.messages, userMessage],
      lastActive: new Date(),
      title: currentSession.messages.length <= 1 ? generateSessionTitle(content) : currentSession.title
    };

    setSessions(prev => prev.map(session => 
      session.id === currentSession.id ? updatedSession : session
    ));

    setCurrentSession(updatedSession);
    setIsTyping(true);

    try {
      // Use AI service with LangGraph integration
      const response = await aiService.sendMessage(
        content, 
        selectedLanguage, 
        currentSession.messages.slice(-5).map(m => m.content)
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.content,
        sender: 'bot',
        timestamp: new Date(),
        language: selectedLanguage
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, botMessage],
        lastActive: new Date()
      };

      setSessions(prev => prev.map(session => 
        session.id === currentSession.id ? finalSession : session
      ));

      setCurrentSession(finalSession);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      // Enhanced fallback response for mental wellness
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: getMentalWellnessFallbackMessage(content, selectedLanguage),
        sender: 'bot',
        timestamp: new Date(),
        language: selectedLanguage
      };

      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, botMessage],
        lastActive: new Date()
      };

      setSessions(prev => prev.map(session => 
        session.id === currentSession.id ? finalSession : session
      ));

      setCurrentSession(finalSession);
    } finally {
      setIsTyping(false);
    }
  };

  // Generate appropriate session title based on content
  const generateSessionTitle = (content: string): string => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('anxiety') || lowerContent.includes('anxious')) {
      return '💙 Anxiety Support';
    } else if (lowerContent.includes('stress') || lowerContent.includes('overwhelm')) {
      return '🌱 Stress Management';
    } else if (lowerContent.includes('sad') || lowerContent.includes('down') || lowerContent.includes('depression')) {
      return '🌈 Mood Support';
    } else if (lowerContent.includes('sleep') || lowerContent.includes('tired')) {
      return '😴 Sleep & Rest';
    } else {
      return '💜 Mental Wellness Chat';
    }
  };

  // Enhanced fallback message for mental wellness context
  const getMentalWellnessFallbackMessage = (userMessage: string, language: string): string => {
    const fallbackMessages = {
      en: `I hear you sharing "${userMessage.slice(0, 50)}${userMessage.length > 50 ? '...' : ''}" with me. While I'm having some technical difficulties right now, I want you to know that your feelings are valid and you're not alone. If you're in crisis, please reach out to a mental health professional or crisis helpline immediately. How can I support you right now?`,
      hi: `मैं समझ रहा हूं कि आप अपनी बात साझा कर रहे हैं। तकनीकी समस्या के बावजूद, मैं चाहता हूं कि आप जानें कि आपकी भावनाएं महत्वपूर्ण हैं। यदि आप संकट में हैं, तो कृपया मानसिक स्वास्थ्य पेशेवर से संपर्क करें।`,
      ta: `நீங்கள் பகிர்ந்து கொள்வதை நான் கேட்கிறேன். தொழில்நுட்ப சிக்கல்கள் இருந்தாலும், உங்கள் உணர்வுகள் முக்கியம் என்பதை அறிந்து கொள்ளுங்கள். நெருக்கடியில் இருந்தால், மனநல நிபுணரை தொடர்பு கொள்ளுங்கள்।`,
      te: `మీరు పంచుకుంటున్నది నేను వింటున్నాను. సాంకేతిక సమస్యలు ఉన్నప్పటికీ, మీ భావనలు ముఖ్యమని తెలుసుకోండి. సంక్షోభంలో ఉంటే, మానసిక ఆరోగ్య నిపుణుడిని సంప్రదించండి।`,
      mr: `तुम्ही काय सांगत आहात ते मी ऐकत आहे. तांत्रिक अडचणी असूनही, तुमच्या भावना महत्वाच्या आहेत हे जाणून घ्या. संकटात असाल तर मानसिक आरोग्य तज्ञाशी संपर्क साधा.`
    };

    return fallbackMessages[language as keyof typeof fallbackMessages] || fallbackMessages.en;
  };

  return (
    <ChatContext.Provider value={{
      sessions,
      currentSession,
      isTyping,
      selectedLanguage,
      createNewSession,
      selectSession,
      deleteSession,
      renameSession,
      clearAllHistory,
      sendMessage,
      setSelectedLanguage,
      isAgentConnected
    }}>
      {children}
    </ChatContext.Provider>
  );
};