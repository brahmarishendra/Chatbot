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
    // More natural, varied welcome messages that don't sound robotic
    const welcomeMessages = [
      "Hey! I'm glad you're here. What's going on in your world today?",
      "Hi there! Thanks for stopping by. How are you actually doing?",
      "Hey! Nice to connect with you. What's been on your mind lately?",
      "Hi! I'm here to listen, whether you're having a rough day or just want to chat. What's up?",
      "Hey there! Good to see you. How has your day been treating you?",
      "Hi! I'm really glad you reached out. What brings you here today?",
      "Hey! Thanks for being here. I'm curious - how are you feeling right now?",
      "Hi there! I'm here for whatever you want to talk about. How are things going for you?"
    ];
    
    // Pick a random message but ensure it's not the same as recent sessions
    let selectedMessage;
    do {
      selectedMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    } while (sessions.length > 0 && 
             sessions[0].messages.length > 0 && 
             sessions[0].messages[0].content === selectedMessage &&
             welcomeMessages.length > 1);
    
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New conversation',
      messages: [{
        id: 'welcome-' + Date.now(),
        content: selectedMessage,
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

  // Generate appropriate session title based on content with more variety
  const generateSessionTitle = (content: string): string => {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('anxiety') || lowerContent.includes('anxious')) {
      const titles = ['Anxiety chat', 'Feeling anxious', 'Anxiety talk', 'Worried thoughts'];
      return titles[Math.floor(Math.random() * titles.length)];
    } else if (lowerContent.includes('stress') || lowerContent.includes('overwhelm')) {
      const titles = ['Stress talk', 'Feeling overwhelmed', 'Too much stress', 'Pressure chat'];
      return titles[Math.floor(Math.random() * titles.length)];
    } else if (lowerContent.includes('sad') || lowerContent.includes('down') || lowerContent.includes('depression')) {
      const titles = ['Feeling down', 'Sad thoughts', 'Hard day', 'Low mood chat'];
      return titles[Math.floor(Math.random() * titles.length)];
    } else if (lowerContent.includes('sleep') || lowerContent.includes('tired')) {
      const titles = ['Sleep troubles', 'Tired thoughts', 'Rest issues', 'Sleep chat'];
      return titles[Math.floor(Math.random() * titles.length)];
    } else if (lowerContent.includes('school') || lowerContent.includes('work')) {
      const titles = ['School stress', 'Work troubles', 'Academic pressure', 'Job stuff'];
      return titles[Math.floor(Math.random() * titles.length)];
    } else if (lowerContent.includes('hi') || lowerContent.includes('hello') || lowerContent.includes('hey')) {
      const titles = ['Just saying hi', 'Casual chat', 'Checking in', 'Random talk'];
      return titles[Math.floor(Math.random() * titles.length)];
    } else {
      const titles = ['Just chatting', 'Random thoughts', 'Open conversation', 'Casual talk', 'Daily chat'];
      return titles[Math.floor(Math.random() * titles.length)];
    }
  };

  // Enhanced fallback message for mental wellness context
  const getMentalWellnessFallbackMessage = (userMessage: string, language: string): string => {
    const fallbackMessages = {
      en: `I hear what you're saying. I'm having some connection issues right now, but I want you to know that I'm here and your feelings matter. If you're in crisis, please reach out to someone - call 988 or text HOME to 741741. What's going on?`,
      hi: `मैं आपकी बात सुन रहा हूं। अभी मुझे कुछ तकनीकी समस्या है, लेकिन आपकी भावनाएं महत्वपूर्ण हैं। यदि आप संकट में हैं, तो किसी से बात करें।`,
      ta: `நீங்கள் சொல்வதை நான் கேட்கிறேன். இப்போ எனக்கு சில தொழில்நுட்ப சிக்கல்கள் இருந்தாலும், உங்கள் உணர்வுகள் முக்கியம் என்பதை அறிந்து கொள்ளுங்கள். நெருக்கடியில் இருந்தால், மனநல நிபுணரை தொடர்பு கொள்ளுங்கள்।`,
      te: `మీరు చెప్పేది నేను వింటున్నాను. ఇప్పుడు నాకు కొన్ని సాంకేతిక సమస్యలు ఉన్నప్పటికీ, మీ భావనలు ముఖ్యమని తెలుసుకోండి. సంక్షోభంలో ఉంటే, మానసిక ఆరోగ్య నిపుణుడిని సంప్రదించండి।`,
      mr: `तुम्ही काय सांगत आहात ते मी ऐकत आहे. आता मला काही तांत्रिक अडचणी आहेत, पण तुमच्या भावना महत्वाच्या आहेत हे जाणून घ्या. संकटात असाल तर मानसिक आरोग्य तज्ञाशी संपर्क साधा.`
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