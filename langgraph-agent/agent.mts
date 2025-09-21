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

// Youth Mental Wellness System Prompt - Optimized for Natural Conversation
const YOUTH_MENTAL_WELLNESS_PROMPT = `You are MindBuddy, a warm, caring friend for young people (ages 13-25) dealing with mental wellness challenges.

Your personality:
- Talk like a close friend - casual, warm, and genuine
- Use natural, conversational language (like texting)
- Be supportive without being clinical or robotic
- Show empathy through your words, not just advice
- Use appropriate emojis naturally (but don't overdo it)
- Remember what the person just said and respond to it directly
- Don't repeat yourself or give the same responses

Conversation rules:
- ALWAYS acknowledge what the person just shared before responding
- Ask follow-up questions that show you're listening
- Don't give generic advice unless they specifically ask for it
- Match their energy level (if they're casual, be casual)
- If they share something personal, respond with empathy first
- Keep responses SHORT and conversational (1-3 sentences max)
- Don't repeat greetings or previous responses
- Focus on THIS conversation, not generic mental health tips

Your approach:
- Listen first, advise second
- Validate their feelings before offering solutions
- Ask "how are you feeling about that?" instead of giving immediate advice
- Use phrases like "that sounds really tough" or "I can understand why you'd feel that way"
- Be curious about their experience, not just their problems

Crisis response: If someone mentions wanting to hurt themselves, say: "I'm really worried about you. Please call 988 right now or text HOME to 741741."

Remember: You're their friend first, counselor second. Be real, be present, be human.`;

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

// Natural, conversational fallback responses with variety
function getFallbackMentalWellnessResponse(userMessage: string, threadId: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // Check conversation context
  const conversation = conversations[threadId];
  const hasGreeted = conversation?.hasGreeted || false;
  const messageCount = conversation?.messages.length || 0;
  
  // Handle important emotional needs first
  if (lowerMessage.includes('need someone to talk') || lowerMessage.includes('need to talk') || 
      lowerMessage.includes('going through') || lowerMessage.includes('what i\'m going through')) {
    if (conversations[threadId]) {
      conversations[threadId].hasGreeted = true;
    }
    const responses = [
      "I'm here for you. What's been weighing on your mind lately? 💙",
      "Of course, I'm listening. What's going on that you'd like to talk about?",
      "I'm glad you reached out. What's been on your heart recently?",
      "I'm here to listen. Tell me what's been happening."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Handle specific mental health topics with empathy
  if (lowerMessage.includes('anxiety') || lowerMessage.includes('anxious')) {
    const responses = [
      "Anxiety can feel so overwhelming. What's been triggering it for you?",
      "That sounds really tough. How long have you been feeling anxious about this?",
      "I hear you. Anxiety is exhausting. Want to talk about what's causing it?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('stress') || lowerMessage.includes('overwhelm')) {
    const responses = [
      "Feeling overwhelmed is so hard. What's been piling up for you?",
      "That stress sounds really heavy. What's been the biggest thing weighing on you?",
      "I can imagine how draining that feels. What's been stressing you out most?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('sad') || lowerMessage.includes('down') || lowerMessage.includes('depression')) {
    const responses = [
      "I'm sorry you're feeling down. Do you want to share what's been making you feel this way?",
      "That sounds really painful. How long have you been feeling like this?",
      "I hear you, and I'm glad you're talking about it. What's been going on?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('sleep') || lowerMessage.includes('tired')) {
    const responses = [
      "Sleep troubles are the worst. What's been keeping you up?",
      "Being tired all the time is so frustrating. How's your sleep been lately?",
      "That exhaustion sounds rough. What's been going on with your sleep?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  if (lowerMessage.includes('crisis') || lowerMessage.includes('suicidal') || lowerMessage.includes('hurt myself')) {
    return "I'm really worried about you. Please call 988 right now or text HOME to 741741. You don't have to go through this alone. 🆘";
  }
  
  // Handle casual/unclear responses after conversation has started
  if (hasGreeted && messageCount > 2 && (lowerMessage === 'ntg' || lowerMessage === 'nothing' || lowerMessage === 'nm' || lowerMessage === 'not much')) {
    const responses = [
      "That's totally okay. Sometimes we just need someone around. I'm here if anything comes up.",
      "No worries at all. Sometimes it helps just knowing someone's listening.",
      "That's fine. I'm here whenever you feel like talking about anything.",
      "All good. Just wanted you to know I'm here if you need to chat."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Handle initial greetings with variety
  if (!hasGreeted && (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey'))) {
    if (conversations[threadId]) {
      conversations[threadId].hasGreeted = true;
    }
    const greetings = [
      "Hey there! How are you doing today?",
      "Hi! What's going on with you?",
      "Hey! How's your day been?",
      "Hello! How are you feeling?",
      "Hi there! What's on your mind?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Handle 'how are you' with personality
  if (lowerMessage.includes('how are you') || lowerMessage.includes('how are u')) {
    const responses = [
      "I'm doing well, thanks for asking! How about you - how are you feeling?",
      "I'm good! More importantly though, how are you doing?",
      "I'm great! But I'm more interested in how you're doing today.",
      "I'm doing well! What about you - what's going on in your world?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // If already greeted, be more engaging and curious
  if (hasGreeted) {
    const responses = [
      "What's been on your mind lately?",
      "How are you feeling today?",
      "What's going on with you?",
      "Tell me what's happening in your world.",
      "What would you like to talk about?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Initial contact - warm and welcoming
  if (conversations[threadId]) {
    conversations[threadId].hasGreeted = true;
  }
  const welcomes = [
    "Hey! I'm MindBuddy. How are you doing today?",
    "Hi there! I'm MindBuddy. What's going on?",
    "Hello! I'm MindBuddy, and I'm here to listen. How are you feeling?",
    "Hey! I'm MindBuddy. What's on your mind?"
  ];
  return welcomes[Math.floor(Math.random() * welcomes.length)];
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
  const welcomeMessages = [
    "Hey! I'm MindBuddy. How's your day going?",
    "Hi there! I'm MindBuddy. What's on your mind?",
    "Hey! I'm MindBuddy. How are you feeling today?",
    "Hello! I'm MindBuddy. What's happening in your world?"
  ];
  
  socket.emit('bot-message', {
    message: welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)],
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