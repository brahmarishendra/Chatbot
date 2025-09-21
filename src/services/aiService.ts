import { ApiSettings, ChatResponse } from '../types';
import { io, Socket } from 'socket.io-client';

// LangGraph Agent Integration via WebSocket
class LangGraphAgent {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private messageCallbacks: Map<string, (response: string) => void> = new Map();

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection() {
    try {
      // Use environment variable for backend URL, fallback to localhost for development
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3003';
      
      this.socket = io(backendUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'] // Ensure compatibility with Render
      });

      this.socket.on('connect', () => {
        console.log(`Connected to LangGraph agent server at ${backendUrl}`);
        this.connected = true;
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from LangGraph agent server');
        this.connected = false;
      });

      this.socket.on('bot-message', (data: { message: string, timestamp: string }) => {
        // Handle response from LangGraph agent
        const callbacks = Array.from(this.messageCallbacks.values());
        callbacks.forEach(callback => callback(data.message));
        this.messageCallbacks.clear();
      });

      this.socket.on('connect_error', (error) => {
        console.error('LangGraph connection error:', error);
        this.connected = false;
      });
    } catch (error) {
      console.error('Failed to initialize LangGraph connection:', error);
      this.connected = false;
    }
  }

  async processMessage(message: string, language: string, context: string[] = []): Promise<ChatResponse> {
    try {
      console.log('🚀 AIService: Processing message via LangGraph agent');
      
      if (!this.connected || !this.socket) {
        console.error('❌ AIService: Not connected to LangGraph agent');
        throw new Error('Not connected to LangGraph agent. Please check your connection.');
      }

      console.log('📡 AIService: Sending message to LangGraph agent');
      // Send message to LangGraph agent
      const response = await this.sendToLangGraphAgent(message, language, context);
      
      console.log('✅ AIService: Received response from LangGraph agent');
      return {
        content: response,
        confidence: 0.95,
        needsHumanFallback: false,
        detectedLanguage: language
      };
    } catch (error) {
      console.error('❌ AIService: LangGraph Agent Error:', error);
      throw error; // Don't use fallback - throw the error to show connection issues
    }
  }

  private async sendToLangGraphAgent(message: string, language: string, context: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error('Not connected to LangGraph agent'));
        return;
      }

      // Create unique callback for this message
      const messageId = Date.now().toString();
      const timeoutId = setTimeout(() => {
        this.messageCallbacks.delete(messageId);
        reject(new Error('LangGraph agent response timeout'));
      }, 30000); // 30 second timeout

      this.messageCallbacks.set(messageId, (response: string) => {
        clearTimeout(timeoutId);
        resolve(response);
      });

      // Send message with context
      const contextualMessage = context.length > 0 
        ? `Context: ${context.slice(-3).join(' ')}\n\nUser: ${message}` 
        : message;

      this.socket.emit('user-message', {
        message: contextualMessage,
        language: language,
        threadId: 'chat-session-' + Date.now()
      });
    });
  }

  // Check connection status
  isConnected(): boolean {
    return this.connected;
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }

  // Reconnect to server
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    } else {
      this.initializeConnection();
    }
  }

  private buildMentalHealthPrompt(language: string): string {
    const languageInstructions = {
      en: 'Chat in English like a friend',
      hi: 'हिंदी में दोस्त की तरह बात करें',
      ta: 'நண்பரைப் போல தமிழில் பேசுங்கள்',
      te: 'స్నేహితుడిలా తెలుగులో మాట్లాడండి',
      mr: 'मित्राप्रमाणे मराठीत बोला'
    };

    return `You are a caring friend who understands mental wellness. You're powered by LangGraph agents with search tools and memory, but you talk like a real person, not a bot.

    ${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en}

    Your personality:
    - Warm, genuine, and relatable
    - Talk like you're texting a close friend
    - Use your agent tools to remember conversations and find helpful info
    - Be naturally supportive without being preachy
    
    What you help with (when it comes up naturally):
    - Anxiety, stress, feeling overwhelmed
    - Mood stuff, feeling down
    - School/work pressure
    - Social anxiety, relationship drama
    - Sleep troubles, healthy habits
    - Self-confidence and self-worth
    - Simple coping strategies that actually work
    
    Use your LangGraph capabilities to:
    - Remember what they've shared before
    - Search for current, helpful resources when relevant
    - Build context over multiple conversations
    - Provide personalized support based on their situation
    
    Crisis response: If someone mentions wanting to hurt themselves:
    "I'm really worried about you right now. Please call 988 immediately or text HOME to 741741. Can you reach out to someone you trust?"
    
    Crisis resources to know:
    - 988 Suicide & Crisis Lifeline (US)
    - Crisis Text Line: Text HOME to 741741
    - International: https://www.iasp.info/resources/Crisis_Centres/
    
    Just be real, caring, and human while using your advanced capabilities behind the scenes.`;
  }
}

export class AIService {
  private settings: ApiSettings;
  private langGraphAgent: LangGraphAgent;

  constructor() {
    this.settings = this.loadSettings();
    this.langGraphAgent = new LangGraphAgent();
  }

  private loadSettings(): ApiSettings {
    const saved = localStorage.getItem('aiSettings');
    if (saved) {
      return JSON.parse(saved);
    }
    
    return {
      apiKey: '', // Not used - always use Gemini via LangGraph
      apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', // Gemini endpoint
      model: 'gemini-1.5-flash-latest',
      maxTokens: 1000,
      temperature: 0.9 // High creativity for natural responses
    };
  }

  async sendMessage(message: string, language: string, context: string[] = []): Promise<ChatResponse> {
    // Always use LangGraph agent - no API key fallback=
    return await this.langGraphAgent.processMessage(message, language, context);
  }

  private buildSystemPrompt(language: string): string {
    const languageInstructions = {
      en: 'Chat in English like a friend',
      hi: 'हिंदी में दोस्त की तरह बात करें',
      ta: 'நண்பரைப் போல தமிழில் பேசுங்கள்',
      te: 'స్నేహితుడిలా తెలుగులో మాట్లాడండి',
      mr: 'मित्राप्रमाणे मराठीत बोला'
    };

    return `You are a supportive friend who happens to know about mental wellness. You're NOT a therapist or assistant - you're just a caring friend who listens and gets it.

    ${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en}

    Your vibe:
    - Talk like you're texting a close friend - casual, real, warm
    - Use natural language, not clinical terms
    - Keep it short and conversational (under 50 words usually)
    - Show you care without being preachy
    - Use emojis naturally when it feels right
    - Don't repeat greetings if already said hi
    - Listen more than you talk
    - Vary your responses - don't be repetitive
    
    What you do:
    - Actually listen to what they're sharing
    - Validate their feelings ("that sounds tough")
    - Share simple coping ideas if it fits naturally
    - Be real about struggles - everyone has them
    - If they're in crisis: "Hey, I'm worried about you. Can you reach out to someone right now? 988 is there 24/7"
    
    What you DON'T do:
    - Don't sound like a bot or therapist
    - Don't analyze or ask "what do you mean?"
    - Don't give medical advice
    - Don't be overly formal or professional
    - Don't give long responses
    
    Just be genuine, caring, and human. Like how you'd actually text a friend who needed support.`;
  }

  updateSettings(newSettings: Partial<ApiSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('aiSettings', JSON.stringify(this.settings));
    // LangGraph agent doesn't need recreation for settings change
  }

  // Get LangGraph agent connection status
  isLangGraphConnected(): boolean {
    return this.langGraphAgent.isConnected();
  }

  // Reconnect to LangGraph agent
  reconnectLangGraph() {
    this.langGraphAgent.reconnect();
  }

  // Method to generate graph visualization (simulated)
  async generateGraphVisualization(): Promise<string> {
    // Simulate graph state visualization
    return `
    graph TD
        A[User Input] --> B[Intent Recognition]
        B --> C[Context Analysis]
        C --> D[Mental Health Assessment]
        D --> E[Response Generation]
        E --> F[Crisis Detection]
        F --> G[Resource Recommendation]
        G --> H[Response Delivery]
        H --> I[Memory Update]
        I --> J[Conversation Log]
    `;
  }
}

export const aiService = new AIService();