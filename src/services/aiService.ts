import { ApiSettings, ChatResponse } from '../types';
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
      if (!this.connected || !this.socket) {
        // Fallback to simulated response if not connected
        return this.getFallbackResponse(message, language);
      }

      // Send message to LangGraph agent
      const response = await this.sendToLangGraphAgent(message, language, context);
      
      return {
        content: response,
        confidence: 0.95,
        needsHumanFallback: false,
        detectedLanguage: language
      };
    } catch (error) {
      console.error('LangGraph Agent Error:', error);
      return this.getFallbackResponse(message, language);
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

  private getFallbackResponse(message: string, language: string): ChatResponse {
    const responses = {
      en: "I hear what you're saying. I'm having some connection issues, but I'm here to listen. If you're in crisis, please reach out to someone - call 988 or text HOME to 741741. What's going on?",
      hi: "मैं आपकी बात सुन रहा हूं। अभी मुझे कुछ कनेक्शन की समस्या है, पर मैं सुनने के लिए यहां हूं। आप कैसा महसूस कर रहे हैं?",
      ta: "நீங்கள் சொல்வதை நான் கேட்கிறேன். இப்போ எனக்கு சில இணைப்பு சிக்கல்கள் இருக்கிறது, ஆனால் நான் கேட்க இங்கே இருக்கிறேன். நீங்கள் எப்படி இருக்கிறீங்கள்?",
      te: "మీరు చెప్పేది నేను వింటున్నాను. ఇప్పుడు నాకు కొన్ని కనెక్షన్ సమస్యలు ఉన్నాయి, కాని నేను వినడానికి ఇక్కడ ఉన్నాను. మీరు ఏమి అనుభవించుతున్నారు?",
      mr: "तुम्ही काय सांगत आहात ते मी ऐकत आहे. आता मला काही कनेक्शनच्या समस्या आहेत, पण मी ऐकण्यासाठी इथे आहे. तुम्ही कसे अनुभवत आहात?"
    };

    return {
      content: responses[language as keyof typeof responses] || responses.en,
      confidence: 0.6,
      needsHumanFallback: true,
      detectedLanguage: language
    };
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
      apiKey: '', // Now empty so users must add their own API key
      apiEndpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo',
      maxTokens: 1000,
      temperature: 0.7
    };
  }

  async sendMessage(message: string, language: string, context: string[] = []): Promise<ChatResponse> {
    if (!this.settings.apiKey || this.settings.apiKey === '') {
      // Use LangGraph agent when no API key is configured
      return await this.langGraphAgent.processMessage(message, language, context);
    }

    try {
      // Use configured API key
      const systemPrompt = this.buildSystemPrompt(language);
      const contextMessages = context.map(msg => ({ role: 'assistant', content: msg }));
      
      const response = await fetch(this.settings.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify({
          model: this.settings.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...contextMessages,
            { role: 'user', content: message }
          ],
          max_tokens: this.settings.maxTokens,
          temperature: this.settings.temperature
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || 'Sorry, I could not process your request.';
      
      return {
        content,
        confidence: 0.9,
        needsHumanFallback: false,
        detectedLanguage: language
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      // Fallback to LangGraph agent
      return await this.langGraphAgent.processMessage(message, language, context);
    }
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
    - Keep it short and conversational
    - Show you care without being preachy
    - Use emojis naturally when it feels right
    - Don't repeat greetings if already said hi
    - Listen more than you talk
    
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