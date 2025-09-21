export interface ApiSettings {
  apiKey: string;
  apiEndpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ChatResponse {
  content: string;
  confidence: number;
  needsHumanFallback: boolean;
  detectedLanguage: string;
}

export interface ConversationLog {
  sessionId: string;
  userId: string;
  messages: Message[];
  language: string;
  timestamp: Date;
  resolved: boolean;
}