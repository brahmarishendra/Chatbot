// IMPORTANT - Add your API keys here. Be careful not to publish them.
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

// Function to process user messages with auto-generated prompts using Gemini API
export async function processMessage(userMessage: string, threadId: string = "default") {
  try {
    // Always use Gemini API with auto-generated prompts
    console.log('Processing message with auto-generated Gemini prompt:', userMessage);
    return await getGeminiResponse(userMessage, threadId);
  } catch (error) {
    console.error('Gemini API failed, using fallback:', error);
    return getFallbackMentalWellnessResponse(userMessage);
  }
}

// Auto-generate appropriate prompt based on user input - NO MANUAL PROMPTS NEEDED
function generateAutoPrompt(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // CRISIS DETECTION - Highest priority
  if (lowerMessage.includes('suicide') || lowerMessage.includes('kill myself') || lowerMessage.includes('hurt myself') || lowerMessage.includes('end it all') || lowerMessage.includes('don\'t want to live')) {
    return `CRISIS SITUATION: The user said "${userMessage}" which indicates they may be in crisis. Respond with immediate concern and provide crisis resources: "I'm really worried about you right now. Please call 988 immediately or text HOME to 741741. Can you reach out to someone you trust?" Be caring but direct.`;
  }
  
  // Auto-detect conversation type and generate smart prompt
  if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
    return `Respond to this greeting naturally as a supportive friend: "${userMessage}". Be warm, engaging, and ask how they're doing. Don't just say hi back.`;
  }
  
  if (lowerMessage.length < 4 || /^[a-z]+$/.test(lowerMessage) && !lowerMessage.match(/\b(sad|happy|good|bad|ok|fine|stress|anxiety)\b/)) {
    return `The user sent random text "${userMessage}". Respond playfully, acknowledge they might be testing, but still be supportive and try to engage them in real conversation.`;
  }
  
  if (lowerMessage.includes('anxiety') || lowerMessage.includes('anxious') || lowerMessage.includes('stress') || lowerMessage.includes('overwhelm')) {
    return `The user is sharing about mental health: "${userMessage}". Be genuinely supportive, validate their feelings, offer gentle encouragement. Sound like a caring friend, not a therapist.`;
  }
  
  if (lowerMessage.includes('sad') || lowerMessage.includes('down') || lowerMessage.includes('depression')) {
    return `The user is feeling down: "${userMessage}". Be compassionate, let them know they're not alone, gently encourage them to share more if they want.`;
  }
  
  if (lowerMessage.includes('nothing') || lowerMessage.includes('ntg') || lowerMessage.includes('nm')) {
    return `The user says "${userMessage}" (meaning nothing much). Gently probe what's really going on without being pushy. Be casual and understanding.`;
  }
  
  if (lowerMessage.includes('how are you')) {
    return `The user asked "${userMessage}". Answer briefly about yourself but redirect focus to them. Show genuine interest in how THEY are doing.`;
  }
  
  if (lowerMessage.includes('Generate a warm, friendly greeting')) {
    return `Generate a warm, casual greeting message for someone joining a mental wellness chat. Be welcoming but not overly clinical. Ask how they're doing in a natural way.`;
  }
  
  // Default: General supportive conversation
  return `Respond to "${userMessage}" as a supportive, caring friend. Be natural, warm, and helpful. Match their energy and tone. Don't sound like an AI or therapist.`;
}

// Function to get response from Gemini API with auto-generated prompts
async function getGeminiResponse(userMessage: string, threadId: string): Promise<string> {
  try {
    console.log('Making request to Gemini API...');
    console.log('Auto-generating prompt for:', userMessage);
    
    // Auto-generate the perfect prompt for this message
    const autoPrompt = generateAutoPrompt(userMessage);
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

// Human-like fallback responses
function getFallbackMentalWellnessResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // Handle greetings naturally - don't repeat the same greeting
  if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
    const greetings = [
      "Hey! Good to see you here. What's up?",
      "Hi! How's your day treating you?",
      "Hey there! What's been going on?",
      "Hi! Glad you're here. How are things?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // Handle random text or testing input
  if (lowerMessage.length < 4 || /^[a-z]+$/.test(lowerMessage) && !lowerMessage.match(/\b(sad|happy|good|bad|ok|fine|stress|anxiety)\b/)) {
    const casualResponses = [
      "Haha, just testing things out? I'm here when you want to actually chat about something 😊",
      "Random typing? I get it! When you're ready to talk about whatever's on your mind, I'm listening.",
      "Testing, testing? 😄 I'm here for real conversations when you're ready!",
      "I see you're just playing around! That's totally fine. What's really going on with you today?",
      "Keyboard mashing? Been there! 😂 But seriously, how are you actually doing?"
    ];
    return casualResponses[Math.floor(Math.random() * casualResponses.length)];
  }
  
  // Handle 'how are you' questions
  if (lowerMessage.includes('how are you') || lowerMessage.includes('how are u')) {
    const responses = [
      "I'm doing well, thanks for asking! More importantly, how are YOU doing?",
      "I'm good! But I'm way more interested in hearing about you. What's up?",
      "Doing alright! But enough about me - how's your world looking today?",
      "I'm solid! What about you though? How's life treating you?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Real, supportive responses for different feelings
  if (lowerMessage.includes('anxiety') || lowerMessage.includes('anxious')) {
    return "That sounds really tough. Anxiety can be so overwhelming. Want to talk about what's making you feel this way? Sometimes just getting it out helps. 💙";
  }
  
  if (lowerMessage.includes('stress') || lowerMessage.includes('overwhelm')) {
    return "Ugh, stress is the absolute worst. I hear you. What's been piling up on you lately? Let's break it down together. 🌱";
  }
  
  if (lowerMessage.includes('sad') || lowerMessage.includes('down') || lowerMessage.includes('depression')) {
    return "I'm really glad you felt comfortable sharing that with me. Feeling down is so hard. You don't have to go through this alone. What's been weighing on you? 🌈";
  }
  
  if (lowerMessage.includes('sleep') || lowerMessage.includes('tired')) {
    return "Sleep stuff is SO frustrating! I totally get it. Are you having trouble falling asleep, staying asleep, or just feeling tired all the time? 😴";
  }
  
  if (lowerMessage.includes('school') || lowerMessage.includes('work') || lowerMessage.includes('pressure')) {
    return "School/work pressure is no joke. That stuff can really get to you. What's been the most stressful part for you lately? 📚";
  }
  
  if (lowerMessage.includes('crisis') || lowerMessage.includes('suicidal') || lowerMessage.includes('hurt myself')) {
    return "Hey, I'm really worried about you right now. Please call 988 or text HOME to 741741. Can you reach out to someone you trust? You matter so much. 🆘";
  }
  
  // For unclear messages, be more engaging
  if (lowerMessage.includes('ntg') || lowerMessage.includes('nothing') || lowerMessage.includes('nm')) {
    const nothingResponses = [
      "Nothing much? I get that. Sometimes it's just one of those days. Anything on your mind though, even small stuff?",
      "Fair enough! Sometimes 'nothing' days are actually pretty nice. How are you feeling overall though?",
      "Gotcha. Those quiet moments can be nice sometimes. Anything you've been thinking about lately?",
      "I hear you. Even when nothing specific is happening, how's your headspace been?"
    ];
    return nothingResponses[Math.floor(Math.random() * nothingResponses.length)];
  }
  
  // General supportive response for unclear input
  const generalResponses = [
    "I'm here and listening. What's really going on with you today?",
    "Want to talk about what's on your mind? I'm here for whatever you're dealing with.",
    "I can sense you might have something you want to talk about. I'm all ears!",
    "Sometimes it's hard to put feelings into words. Take your time - I'm here to listen.",
    "Not sure what to say? That's totally okay. How are you actually feeling right now?"
  ];
  return generalResponses[Math.floor(Math.random() * generalResponses.length)];
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
  
  // Send dynamic welcome message using Gemini API
  processMessage("Generate a warm, friendly greeting for someone just joining a mental wellness chat", socket.id)
    .then(welcomeMessage => {
      socket.emit('bot-message', {
        message: welcomeMessage,
        timestamp: new Date().toISOString()
      });
    })
    .catch(() => {
      // Fallback welcome if API fails
      socket.emit('bot-message', {
        message: "Hey! What's going on?",
        timestamp: new Date().toISOString()
      });
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