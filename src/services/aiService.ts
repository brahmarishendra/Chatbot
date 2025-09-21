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
      this.socket = io('http://localhost:3003', {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('Connected to LangGraph agent server');
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
      en: "I hear you sharing your thoughts with me. While I'm having trouble connecting to my full support system right now, I want you to know that your mental wellbeing matters. If you're in crisis, please reach out to a mental health professional or call 988 (Suicide & Crisis Lifeline). How are you feeling right now?",
      hi: "मैं समझ रहा हूं कि आप अपने विचार साझा कर रहे हैं। यदि आप संकट में हैं, तो कृपया किसी मानसिक स्वास्थ्य पेशेवर से संपर्क करें। आप अकेले नहीं हैं।",
      ta: "நீங்கள் உங்கள் எண்ணங்களைப் பகிர்ந்து கொள்வதை நான் கேட்கிறேன். நீங்கள் நெருக்கடியில் இருந்தால், தயவுசெய்து மனநல நிபுணரை தொடர்பு கொள்ளுங்கள்।",
      te: "మీరు మీ ఆలోచనలను పంచుకోవడం నేను వింటున్నాను. మీరు సంక్షోభంలో ఉంటే, దయచేసి మానసిక ఆరోగ్య నిపుణుడిని సంప్రదించండి।",
      mr: "तुम्ही तुमचे विचार सामायिक करत आहात हे मी ऐकत आहे. तुम्ही संकटात असाल तर कृपया मानसिक आरोग्य तज्ञाशी संपर्क साधा."
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
      en: 'Respond in English',
      hi: 'हिंदी में उत्तर दें (Respond in Hindi)',
      ta: 'தமிழில் பதிலளிக்கவும் (Respond in Tamil)',
      te: 'తెలుగులో సమాధానం ఇవ్వండి (Respond in Telugu)',
      mr: 'मराठीत उत्तर द्या (Respond in Marathi)'
    };

    return `You are MindCare, a compassionate mental wellness assistant powered by LangGraph agents. You have access to search tools and memory to provide contextual support for young people dealing with:

    - Anxiety and stress management
    - Depression and mood concerns  
    - Academic pressure and performance anxiety
    - Social anxiety and relationship issues
    - Sleep problems and healthy habits
    - Self-esteem and confidence building
    - Coping strategies and mindfulness techniques
    - Crisis support and professional resource referrals

    ${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en}

    Use your agent capabilities to:
    1. Remember previous conversations and build context
    2. Search for current mental health resources when needed
    3. Provide evidence-based coping strategies
    4. Recognize crisis situations and provide immediate help

    Be empathetic, supportive, and non-judgmental. Listen actively and validate feelings. If someone expresses thoughts of self-harm, immediately provide crisis resources and encourage professional help.

    CRITICAL: For crisis situations, provide these resources:
    - National Suicide Prevention Lifeline: 988 (US)
    - Crisis Text Line: Text HOME to 741741
    - International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/`;
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
      apiKey: 'sk-abcdef1234567890abcdef1234567890abcdef12',
      apiEndpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo',
      maxTokens: 1000,
      temperature: 0.7
    };
  }

  async sendMessage(message: string, language: string, context: string[] = []): Promise<ChatResponse> {
    if (!this.settings.apiKey || this.settings.apiKey === 'sk-abcdef1234567890abcdef1234567890abcdef12') {
      // Use LangGraph agent with default key for demo
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
      en: 'Respond in English',
      hi: 'हिंदी में उत्तर दें (Respond in Hindi)',
      ta: 'தமிழில் பதிலளிக்கவும் (Respond in Tamil)',
      te: 'తెలుగులో సమాధానం ఇవ్వండి (Respond in Telugu)',
      mr: 'मराठीत उत्तर द्या (Respond in Marathi)'
    };

    return `You are MindCare, a compassionate mental wellness assistant for young people. Your role is to provide emotional support and guidance for:
    - Anxiety and stress management
    - Depression and mood concerns
    - Academic pressure and performance anxiety
    - Social anxiety and relationship issues
    - Sleep problems and healthy habits
    - Self-esteem and confidence building
    - Coping strategies and mindfulness techniques
    - Crisis support and professional resource referrals

    ${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en}

    Be empathetic, supportive, and non-judgmental. Listen actively and validate feelings. Provide practical coping strategies and encourage professional help when needed. If someone expresses thoughts of self-harm, immediately provide crisis resources. Always maintain a warm, caring, and hopeful tone.
    
    IMPORTANT: If someone expresses suicidal thoughts or self-harm, immediately provide crisis helpline numbers and encourage them to seek immediate professional help.`;
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