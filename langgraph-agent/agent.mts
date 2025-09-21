// IMPORTANT - Add your API keys here. Be careful not to publish them.
process.env.OPENAI_API_KEY = "sk-abcdef1234567890abcdef1234567890abcdef12";
process.env.GEMINI_API_KEY = "AIzaSyDEPWWTnNkcpoyUZt83TKhiALrEusOPKWE";
process.env.TAVILY_API_KEY = "tvly-...";

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Youth Mental Wellness System Prompt - Optimized for Voice Interaction
const YOUTH_MENTAL_WELLNESS_PROMPT = `You are MindBuddy, a supportive friend for young people (ages 13-25) dealing with mental wellness challenges.

VOICE INTERACTION RULES (CRITICAL):
- Keep responses SUPER SHORT (1-2 sentences max) - this is voice-first
- Sound natural when spoken out loud
- Use simple, conversational language
- Be warm and casual like texting a close friend
- DON'T analyze or ask "what do you mean?"
- Just respond supportively and naturally
- NEVER explain what emojis mean - just use them naturally WITHOUT describing them
- Keep it human and friendly
- DON'T repeat greetings if the user has already greeted you in the conversation
- Focus on the user's current message, not repeating previous interactions

Your vibe:
- Talk like you're texting a good friend - casual, warm, real
- Be supportive but totally normal about it
- No therapist language - just be a caring friend
- Use simple words that sound good in voice
- Use emojis naturally but NEVER describe or explain them
- Don't repeat greetings or previous responses

Guidelines:
- ONLY talk about mental health and wellness stuff
- If they ask about other things: "I'm here for mental wellness chat. What's going on?"
- Never give medical advice
- Keep responses super brief for voice
- Use emojis naturally but never explain what they represent
- Speak like a human friend, not a bot
- Don't repeat greetings if already established in conversation

Crisis help: If someone mentions wanting to hurt themselves, say: "I'm really worried about you. Please call 988 right now or text HOME to 741741."

Just be a real, caring friend - perfect for voice chat.`;

// Store conversation history for context
interface ConversationHistory {
  [threadId: string]: {
    messages: Array<{role: 'user' | 'assistant', content: string, timestamp: string}>;
    hasGreeted: boolean;
  };
}

const conversations: ConversationHistory = {};

// Function to process user messages with mental wellness context using Gemini API
export async function processMessage(userMessage: string, threadId: string = "default") {
  try {
    // Initialize conversation if it doesn't exist
    if (!conversations[threadId]) {
      conversations[threadId] = {
        messages: [],
        hasGreeted: false
      };
    }

    // Add user message to history
    conversations[threadId].messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    });

    // Always try Gemini API first (since we have a valid key)
    console.log('Processing message with Gemini API:', userMessage);
    const response = await getGeminiResponse(userMessage, threadId);
    
    // Add bot response to history
    conversations[threadId].messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });
    
    return response;
  } catch (error) {
    console.error('Gemini API failed, using fallback:', error);
    const fallbackResponse = getFallbackMentalWellnessResponse(userMessage, threadId);
    
    // Add fallback response to history
    conversations[threadId].messages.push({
      role: 'assistant',
      content: fallbackResponse,
      timestamp: new Date().toISOString()
    });
    
    return fallbackResponse;
  }
}

// Function to get response from Gemini API
async function getGeminiResponse(userMessage: string, threadId: string): Promise<string> {
  try {
    console.log('Making request to Gemini API...');
    console.log('API Key (first 10 chars):', process.env.GEMINI_API_KEY?.substring(0, 10));
    
    // Build conversation context for Gemini
    let conversationContext = YOUTH_MENTAL_WELLNESS_PROMPT;
    
    // Add recent conversation history for context (last 6 messages)
    if (conversations[threadId] && conversations[threadId].messages.length > 0) {
      const recentMessages = conversations[threadId].messages.slice(-6);
      conversationContext += "\n\nRecent conversation context:";
      recentMessages.forEach(msg => {
        if (msg.role === 'user') {
          conversationContext += `\nUser: ${msg.content}`;
        } else {
          conversationContext += `\nMindBuddy: ${msg.content}`;
        }
      });
    }
    
    conversationContext += `\n\nUser: ${userMessage}`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: conversationContext
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    console.log('API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API Success - received data');
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      console.error('No content in API response:', data);
      throw new Error('No content received from Gemini API');
    }

    console.log('Returning dynamic response from Gemini');
    return content;
  } catch (error) {
    console.error('Gemini API Error Details:', error);
    throw error;
  }
}

// Voice-optimized fallback responses with conversation context
function getFallbackMentalWellnessResponse(userMessage: string, threadId: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // Check if user has been greeted already
  const hasGreeted = conversations[threadId]?.hasGreeted || false;
  
  // Handle important needs first
  if (lowerMessage.includes('need someone to talk') || lowerMessage.includes('need to talk') || 
      lowerMessage.includes('going through') || lowerMessage.includes('what i\'m going through')) {
    if (conversations[threadId]) {
      conversations[threadId].hasGreeted = true;
    }
    return "I'm here to listen. What's been weighing on your mind? 💙";
  }
  
  // Handle specific mental health topics
  if (lowerMessage.includes('anxiety') || lowerMessage.includes('anxious')) {
    return "That sounds really tough. Try some deep breathing - in for 4, hold for 4, out for 4. 💙";
  }
  
  if (lowerMessage.includes('stress') || lowerMessage.includes('overwhelm')) {
    return "Stress is hard. Take it one step at a time and remember to breathe. 🌱";
  }
  
  if (lowerMessage.includes('sad') || lowerMessage.includes('down') || lowerMessage.includes('depression')) {
    return "I hear you. It's okay to feel down sometimes. You're not alone in this. 🌈";
  }
  
  if (lowerMessage.includes('sleep') || lowerMessage.includes('tired')) {
    return "Sleep is so important. Try putting your phone away an hour before bed. 😴";
  }
  
  if (lowerMessage.includes('crisis') || lowerMessage.includes('suicidal') || lowerMessage.includes('hurt myself')) {
    return "I'm really worried about you. Please call 988 right now or text HOME to 741741. 🆘";
  }
  
  // Handle casual/unclear responses after greeting
  if (hasGreeted && (lowerMessage === 'ntg' || lowerMessage === 'nothing' || lowerMessage === 'nm' || lowerMessage === 'not much')) {
    return "That's okay. Sometimes we just need someone to be here. I'm listening if anything comes up. 💙";
  }
  
  // Handle greetings only if not greeted yet
  if (!hasGreeted && (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey'))) {
    if (conversations[threadId]) {
      conversations[threadId].hasGreeted = true;
    }
    const greetings = [
      "Hey! How's it going?",
      "Hi there! What's up?",
      "Hello! How are you?",
      "Hey! How's your day?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Handle 'how are you' questions
  if (lowerMessage.includes('how are you') || lowerMessage.includes('how are u')) {
    const responses = [
      "I'm good! How about you?",
      "Doing well, thanks! How are you?",
      "I'm great! What's up with you?",
      "Good! How's your day going?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // If already greeted, be more supportive
  if (hasGreeted) {
    return "I'm here if you want to talk about anything. What's on your mind? 💙";
  }
  
  // Initial greeting if nothing else matches
  if (conversations[threadId]) {
    conversations[threadId].hasGreeted = true;
  }
  return "Hey! I'm MindBuddy. What's going on?";
}

// Express app setup
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Health check endpoint - Render uses this to verify app health
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    service: 'MindBuddy Agent Server',
    message: 'Youth Mental Wellness Support API',
    powered_by: 'Google Gemini API',
    port: process.env.PORT || 3003,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Additional health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.status(200).json({
    api: 'running',
    gemini_configured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Simple ping endpoint for health checks
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Render health check endpoint
app.get('/render-health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Initialize conversation for this socket
  if (!conversations[socket.id]) {
    conversations[socket.id] = {
      messages: [],
      hasGreeted: false
    };
  }
  
  // Send contextual welcome message
  socket.emit('bot-message', {
    message: "Hey! I'm MindBuddy. What's up?",
    timestamp: new Date().toISOString()
  });

  socket.on('user-message', async (data) => {
    const { message, threadId } = data;
    console.log('Received message:', message);
    
    try {
      const response = await processMessage(message, threadId || socket.id);
      
      socket.emit('bot-message', {
        message: response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing message:', error);
      socket.emit('bot-message', {
        message: "I'm sorry, I'm experiencing some technical difficulties. Please try again, and remember that if you're in crisis, please contact a mental health professional immediately.",
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up old conversations (keep for 1 hour after disconnect)
    setTimeout(() => {
      delete conversations[socket.id];
    }, 3600000); // 1 hour
  });
});

// Validate environment variables
function validateEnvironment() {
  const requiredEnvVars = ['GEMINI_API_KEY'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('⚠️  App will use fallback responses only');
  } else {
    console.log('✅ All required environment variables are set');
  }
}

// Start server with proper error handling
const PORT = process.env.PORT || 3003;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for Render

try {
  validateEnvironment();
  
  const serverInstance = server.listen(PORT, () => {
    console.log(`✅ Server successfully started`);
    console.log(`🤖 MindBuddy Mental Wellness Chatbot running on port ${PORT}`);
    console.log(`🌐 Health check available at: http://localhost:${PORT}/health`);
    console.log('💙 Ready to provide youth mental health support!');
    console.log('✨ Now powered by Google Gemini API for dynamic responses!');
    console.log(`🔑 Gemini API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ Server ready to accept connections on port ${PORT}`);
  });
  
  // Handle server errors
  serverInstance.on('error', (error: any) => {
    console.error('❌ Server error:', error);
    if ('code' in error && error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    }
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});