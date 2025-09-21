// IMPORTANT - Add your API keys here. Be careful not to publish them.
process.env.GEMINI_API_KEY = "AIzaSyDBDOs7UfPYWHWJymfJHKwcAR3thuUyr1w"; // Updated API key
process.env.TAVILY_API_KEY = "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";

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to process user messages with auto-generated prompts using Gemini API
export async function processMessage(userMessage: string, threadId: string = "default") {
  try {
    // Always use Gemini API with auto-generated prompts - NO FALLBACK
    console.log('Processing message with auto-generated Gemini prompt:', userMessage);
    return await getGeminiResponse(userMessage, threadId);
  } catch (error) {
    console.error('Gemini API failed:', error);
    // Return error message instead of fallback responses
    throw new Error('I apologize, but I\'m having trouble connecting to my AI service right now. Please try again in a moment.');
  }
}

// Conversation memory to track context and avoid repetitive responses
const conversationMemory = new Map<string, { 
  lastTopics: string[], 
  greetingCount: number, 
  lastResponses: string[],
  conversationStage: 'initial' | 'engaged' | 'deepening',
  randomTestCount: number,
  hasIntroduced: boolean,
  lastActivity: Date
}>();

// Clean up old conversation memories every hour
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [threadId, memory] of conversationMemory.entries()) {
    if (memory.lastActivity < oneHourAgo) {
      conversationMemory.delete(threadId);
    }
  }
}, 60 * 60 * 1000);

// Auto-generate contextual prompts that feel natural and human
function generateAutoPrompt(userMessage: string, threadId: string = "default"): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // Get or create conversation memory
  if (!conversationMemory.has(threadId)) {
    conversationMemory.set(threadId, {
      lastTopics: [],
      greetingCount: 0,
      lastResponses: [],
      conversationStage: 'initial',
      randomTestCount: 0,
      hasIntroduced: false,
      lastActivity: new Date()
    });
  }
  
  const memory = conversationMemory.get(threadId)!;
  memory.lastActivity = new Date(); // Update activity timestamp
  
  // CRISIS DETECTION - Highest priority
  if (lowerMessage.includes('suicide') || lowerMessage.includes('kill myself') || lowerMessage.includes('hurt myself') || lowerMessage.includes('end it all') || lowerMessage.includes('don\'t want to live')) {
    return `URGENT CRISIS: The user said "${userMessage}" indicating they may be in immediate danger. Respond with genuine concern, empathy, and immediate resources: "I'm really worried about you right now. Your life has value and you matter. Please call 988 immediately or text HOME to 741741. Can you reach out to someone you trust right now?" Be caring, direct, and focus entirely on their safety.`;
  }
  
  // Handle greetings - be natural and brief
  if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
    memory.greetingCount++;
    
    if (memory.greetingCount === 1 && !memory.hasIntroduced) {
      memory.hasIntroduced = true;
      return `User said "${userMessage}". Respond naturally and briefly like a friend. Keep it short but varied - "hey! how's it going?" or "hi there! what's up?" or "hey 👋 how are you?" Mix it up each time. Don't be overly enthusiastic. Be casual and genuine.`;
    } else {
      return `User greeted again: "${userMessage}". Keep it brief and natural but DIFFERENT from before. Try "hey again", "what's going on?", "how are things?", "sup?". Vary the response - don't repeat the same greeting.`;
    }
  }
  
  // Handle single letters or very short messages
  if (lowerMessage.length === 1 || (lowerMessage.length < 4 && /^[a-z]+$/.test(lowerMessage))) {
    memory.randomTestCount++;
    
    const shortMessageVariations = [
      `User sent very short message "${userMessage}". Respond briefly and naturally. "${userMessage}?", "hm?", "what's that?", "not sure what you mean", "everything good?". Keep it SHORT - like how a real person would respond. Don't be overly helpful.`,
      `User typed "${userMessage}". Be natural about it. "uh... what?", "${userMessage}??", "come again?", "you alright?". Keep response under 5 words. Be casual and real.`,
      `Short message from user: "${userMessage}". Respond like a confused friend. "???", "what now?", "${userMessage}... okay?", "say what?". Be natural and brief.`
    ];
    
    if (memory.randomTestCount === 1) {
      return shortMessageVariations[0];
    } else {
      return shortMessageVariations[Math.floor(Math.random() * shortMessageVariations.length)];
    }
  }
  
  // Handle longer random text
  if (lowerMessage.length > 3 && /^[a-z]+$/.test(lowerMessage) && !lowerMessage.match(/\b(sad|happy|good|bad|ok|fine|stress|anxiety|yes|no|bye|hello|hi)\b/)) {
    return `User sent random letters "${userMessage}". Respond like a normal person would - maybe "uh... what?" or "keyboard acting up?" or "everything ok?". Keep it super short and natural. Don't try to be overly helpful.`;
  }
  
  // Handle simple responses
  if (lowerMessage.match(/^(good|fine|ok|okay|alright|yeah|yes|no|nothing|nm)$/)) {
    const responseVariations = [
      `User said "${userMessage}". Respond casually and naturally. Mix it up - "cool", "gotcha", "fair enough", "makes sense", "alright". Then maybe ask something simple like "anything else going on?" or "what's been happening?". Keep it conversational.`,
      `User gave brief response: "${userMessage}". Be natural and show mild interest. "ah okay", "right on", "I hear you". Maybe follow with "so what's new?" or "how's your day been?". Don't push too hard. Keep it light.`,
      `User said "${userMessage}". Respond like a real friend would. "word", "bet", "for sure", "I feel that". Maybe add "what else is up?" or "anything interesting happening?". Stay casual and authentic.`
    ];
    return responseVariations[Math.floor(Math.random() * responseVariations.length)];
  }
  
  // Handle goodbye
  if (lowerMessage.includes('bye') || lowerMessage.includes('later') || lowerMessage.includes('gotta go')) {
    const byeVariations = [
      `User is saying goodbye: "${userMessage}". Respond naturally and briefly like a friend. "see ya", "later", "take care", "catch you later", "peace". Keep it short and genuine.`,
      `User saying bye: "${userMessage}". Be natural about it. "bye", "talk soon", "see you around", "later dude", "take it easy". Match their energy - casual and brief.`,
      `User leaving: "${userMessage}". Respond like a real friend would. "alright, see ya", "later!", "bye for now", "catch you on the flip side". Keep it natural and not too formal.`
    ];
    return byeVariations[Math.floor(Math.random() * byeVariations.length)];
  }
  
  // Mental health topics - be supportive but natural
  if (lowerMessage.includes('anxiety') || lowerMessage.includes('anxious') || lowerMessage.includes('stress') || lowerMessage.includes('overwhelm')) {
    return `User mentioned anxiety/stress: "${userMessage}". Respond with genuine care but keep it natural and not too long. Show you understand without being preachy. Ask one simple question to show you care.`;
  }
  
  // Sadness/depression - gentle support
  if (lowerMessage.includes('sad') || lowerMessage.includes('down') || lowerMessage.includes('depression') || lowerMessage.includes('depressed')) {
    return `User sharing difficult feelings: "${userMessage}". Respond with gentle empathy. Keep it brief but caring. Let them know you're listening without overwhelming them with advice.`;
  }
  
  // Default - natural conversation with variety
  const defaultVariations = [
    `User said: "${userMessage}". Respond naturally like a caring friend would. Keep it conversational, not too long, and genuine. Show interest but don't interrogate. Be like someone they'd actually want to talk to. Mix up your response style.`,
    `User message: "${userMessage}". Be authentic and natural. Respond like you're texting a friend. Keep it casual, show you care, but don't be pushy. Vary your tone and approach.`,
    `User shared: "${userMessage}". Respond with genuine interest like a real friend. Keep it natural and conversational. Don't sound like a bot - be human and relatable. Change up how you respond.`
  ];
  return defaultVariations[Math.floor(Math.random() * defaultVariations.length)];
}

// Function to get response from Gemini API with auto-generated prompts
async function getGeminiResponse(userMessage: string, threadId: string): Promise<string> {
  try {
    console.log('Making request to Gemini API...');
    console.log('Auto-generating prompt for:', userMessage);
    
    // Auto-generate the perfect prompt for this message
    const autoPrompt = generateAutoPrompt(userMessage, threadId);
    console.log('Generated prompt:', autoPrompt);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: autoPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.9, // High creativity for human-like responses
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

    console.log('Returning auto-generated response from Gemini');
    return content.trim();
  } catch (error) {
    console.error('Gemini API Error Details:', error);
    throw error;
  }
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
io.on('connection', async (socket) => {
  console.log('User connected:', socket.id);
  
  // Generate a dynamic welcome message using Gemini API
  try {
    const welcomeMessage = await getGeminiResponse('Generate a warm, friendly welcome message for a new user connecting to a mental health support chatbot. Make it inviting and ask how they\'re doing or what\'s on their mind. Keep it under 50 words.', socket.id);
    
    socket.emit('bot-message', {
      message: welcomeMessage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Only if Gemini fails, use a simple fallback
    console.error('Failed to generate welcome message:', error);
    socket.emit('bot-message', {
      message: "Hey! I'm here to listen and support you. How are you doing today?",
      timestamp: new Date().toISOString()
    });
  }

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
      const errorMessage = error instanceof Error ? error.message : "I'm having trouble connecting right now. Please try again in a moment.";
      socket.emit('bot-message', {
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
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