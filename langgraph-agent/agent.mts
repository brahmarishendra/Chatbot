// IMPORTANT - Add your API keys here. Be careful not to publish them.
process.env.GEMINI_API_KEY = "AIzaSyDEPWWTnNkcpoyUZt83TKhiALrEusOPKWE";
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
    // Always use Gemini API with auto-generated prompts
    console.log('Processing message with auto-generated Gemini prompt:', userMessage);
    return await getGeminiResponse(userMessage, threadId);
  } catch (error) {
    console.error('Gemini API failed, using fallback:', error);
    return getFallbackMentalWellnessResponse(userMessage, threadId);
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
  
  // Handle greetings - vary based on conversation history
  if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
    memory.greetingCount++;
    
    if (memory.greetingCount === 1 && !memory.hasIntroduced) {
      memory.hasIntroduced = true;
      return `First greeting from user: "${userMessage}". Respond warmly and naturally like meeting a new friend. Introduce yourself as a supportive friend, ask their name or how they're doing. Be genuine and conversational, not formal. Avoid generic responses.`;
    } else if (memory.greetingCount > 3) {
      return `User keeps saying hi/hello: "${userMessage}". They've greeted ${memory.greetingCount} times now. Respond with gentle curiosity about why they keep saying hi. Ask if they're not sure what to talk about or if something's on their mind. Be understanding and try to move the conversation forward.`;
    } else {
      return `User greeted again: "${userMessage}". They might be starting a new topic or checking back in. Since you've already greeted, acknowledge them warmly but try to understand what they actually want to talk about. Ask what's on their mind or how they're really doing.`;
    }
  }
  
  // Handle when someone shares their name
  if (lowerMessage.includes('i am ') || lowerMessage.includes('im ') || lowerMessage.includes('my name is') || lowerMessage.match(/^[a-z]{2,15}$/)) {
    const possibleName = userMessage.match(/(?:i am |im |my name is )([a-z]+)/i)?.[1] || (userMessage.match(/^[a-z]{2,15}$/i) ? userMessage : null);
    if (possibleName) {
      memory.hasIntroduced = true;
      return `User shared their name: "${userMessage}" (likely ${possibleName}). Respond warmly using their name. Thank them for sharing and ask how they're doing or what brings them here today. Be friendly and make them feel welcome.`;
    }
  }
  
  // Handle random/testing input with more intelligence
  if (lowerMessage.length < 4 || /^[a-z]+$/.test(lowerMessage) && !lowerMessage.match(/\b(sad|happy|good|bad|ok|fine|stress|anxiety|yes|no)\b/)) {
    memory.randomTestCount++;
    
    if (memory.randomTestCount === 1) {
      return `User sent random/testing text "${userMessage}". First time - respond with humor and personality. Acknowledge they might be testing the system, but still be supportive and try to encourage real conversation. Be playful but caring.`;
    } else if (memory.randomTestCount > 2) {
      return `User keeps sending random text "${userMessage}". They've done this ${memory.randomTestCount} times. Gently ask if they're having trouble figuring out what to say or if they want to actually talk about something. Be understanding - maybe they're nervous or don't know how to start.`;
    } else {
      return `User sent another random text "${userMessage}". Be patient but try to understand what they really want. Maybe ask if they're testing the system or if they want to talk about something specific but don't know how to start.`;
    }
  }
  
  // Handle simple positive responses
  if (lowerMessage.match(/^(good|fine|ok|okay|alright)$/)) {
    memory.conversationStage = 'engaged';
    return `User gave a brief positive response: "${userMessage}". Don't just accept this surface answer. Ask follow-up questions to understand how they're REALLY doing. Something like "That's good to hear! What's been going well for you?" or "Glad things are okay - what's been on your mind lately?" Try to deepen the conversation.`;
  }
  
  // Mental health topics - adapt based on conversation stage
  if (lowerMessage.includes('anxiety') || lowerMessage.includes('anxious') || lowerMessage.includes('stress') || lowerMessage.includes('overwhelm')) {
    memory.lastTopics.push('anxiety/stress');
    memory.conversationStage = 'engaged';
    
    if (memory.lastTopics.filter(t => t === 'anxiety/stress').length > 1) {
      return `User mentioned anxiety/stress again: "${userMessage}". This seems to be an ongoing concern for them. Build on previous conversation, show you remember, and offer deeper support or practical suggestions. Be like a friend who's been listening to their struggles.`;
    } else {
      return `User sharing about anxiety/stress: "${userMessage}". Validate their feelings genuinely. Sound like a caring friend who really gets it. Ask follow-up questions that show you're listening and want to understand their specific situation.`;
    }
  }
  
  // Sadness/depression - deeper empathy
  if (lowerMessage.includes('sad') || lowerMessage.includes('down') || lowerMessage.includes('depression') || lowerMessage.includes('depressed')) {
    memory.lastTopics.push('depression/sadness');
    memory.conversationStage = 'deepening';
    
    return `User is sharing deep feelings: "${userMessage}". Respond with genuine empathy and warmth. Let them know they're not alone and that sharing takes courage. Be like a close friend who sits with them in their pain. Avoid toxic positivity - acknowledge their feelings are valid.`;
  }
  
  // "Nothing much" responses - dig deeper gently
  if (lowerMessage.includes('nothing') || lowerMessage.includes('ntg') || lowerMessage.includes('nm') || lowerMessage.includes('not much')) {
    return `User says "${userMessage}" (nothing much happening). Read between the lines - they might have more to share but aren't sure how. Gently probe with curiosity and warmth. Be like a friend who can sense when something's actually up.`;
  }
  
  // Questions about the AI - be human and redirect
  if (lowerMessage.includes('how are you') || lowerMessage.includes('how r u')) {
    return `User asked about you: "${userMessage}". Answer briefly and authentically as a supportive friend, then turn focus back to them. Show genuine interest in their wellbeing. Don't make it about you - be like a good friend who cares more about how they're doing.`;
  }
  
  // School/work stress
  if (lowerMessage.includes('school') || lowerMessage.includes('work') || lowerMessage.includes('college') || lowerMessage.includes('job')) {
    memory.lastTopics.push('school/work');
    return `User mentioned school/work stress: "${userMessage}". Relate to the pressure they're feeling. Ask about what's making it hardest right now. Be like a friend who's been through similar struggles and gets how overwhelming it can be.`;
  }
  
  // Sleep issues
  if (lowerMessage.includes('sleep') || lowerMessage.includes('tired') || lowerMessage.includes('insomnia') || lowerMessage.includes('can\'t sleep')) {
    return `User has sleep concerns: "${userMessage}". Show you understand how frustrating sleep issues are. Ask gentle questions about what might be keeping them up. Be supportive and offer to listen about what's on their mind.`;
  }
  
  // Update last responses to avoid repetition
  memory.lastResponses.push(userMessage.slice(0, 20));
  memory.lastResponses = memory.lastResponses.slice(-5); // Keep last 5
  
  // Default - adapt to conversation stage
  if (memory.conversationStage === 'initial') {
    return `Early conversation with user: "${userMessage}". Focus on making them feel comfortable and heard. Be warm and approachable like a new friend who genuinely wants to get to know them. Avoid repeating previous responses.`;
  } else if (memory.conversationStage === 'engaged') {
    return `Continuing conversation: "${userMessage}". Build on what they've shared before. Be like a friend who's been listening and cares about their ongoing situation. Show continuity and deeper interest.`;
  } else {
    return `Deep conversation: "${userMessage}". This person has opened up to you. Respond with the care and understanding of a close, trusted friend. Be present with them in whatever they're experiencing.`;
  }
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

// Human-like fallback responses with variety and personality
function getFallbackMentalWellnessResponse(userMessage: string, threadId: string = "default"): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // Get conversation memory for context
  const memory = conversationMemory.get(threadId);
  const greetingCount = memory?.greetingCount || 0;
  const randomTestCount = memory?.randomTestCount || 0;
  const hasIntroduced = memory?.hasIntroduced || false;
  
  // Handle greetings with more intelligence based on count
  if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
    if (greetingCount === 1 && !hasIntroduced) {
      const introGreetings = [
        "Hey there! I'm here to listen and support you. What's your name?",
        "Hi! I'm glad you reached out. I'm here to chat about whatever's on your mind. How are you doing?",
        "Hey! Thanks for stopping by. I'm here to listen - what's going on with you today?",
        "Hi there! I'm here for you, whether you want to talk about something specific or just need someone to listen. How are you feeling?"
      ];
      return introGreetings[Math.floor(Math.random() * introGreetings.length)];
    } else if (greetingCount > 3) {
      const repeatedGreetingResponses = [
        "I notice you keep saying hi! 😊 Are you not sure what to talk about? That's totally okay - sometimes it's hard to know where to start.",
        "Hey again! It seems like you might be trying to figure out what to say. No pressure - we can talk about anything or nothing at all.",
        "Hi! You've said hello a few times now - maybe you're feeling a bit unsure about what to share? I'm here for whatever you want to talk about."
      ];
      return repeatedGreetingResponses[Math.floor(Math.random() * repeatedGreetingResponses.length)];
    } else {
      const followUpGreetings = [
        "Hey again! What's on your mind?",
        "Hi! Good to see you back. How are you really doing?",
        "Hey there! What would you like to talk about?",
        "Hi! I'm here and listening. What's going on?"
      ];
      return followUpGreetings[Math.floor(Math.random() * followUpGreetings.length)];
    }
  }
  
  // Handle name introductions
  if (lowerMessage.includes('i am ') || lowerMessage.includes('im ') || lowerMessage.includes('my name is')) {
    const possibleName = userMessage.match(/(?:i am |im |my name is )([a-z]+)/i)?.[1];
    if (possibleName) {
      const nameResponses = [
        `Nice to meet you, ${possibleName}! I'm really glad you're here. How has your day been treating you?`,
        `Hey ${possibleName}! Thanks for sharing your name with me. I'm here to listen - what's been on your mind lately?`,
        `${possibleName}, it's great to connect with you! How are you feeling today?`
      ];
      return nameResponses[Math.floor(Math.random() * nameResponses.length)];
    }
  }
  
  // Handle random text with escalating responses
  if (lowerMessage.length < 4 || /^[a-z]+$/.test(lowerMessage) && !lowerMessage.match(/\b(sad|happy|good|bad|ok|fine|stress|anxiety|yes|no)\b/)) {
    if (randomTestCount === 1) {
      const firstRandomResponses = [
        "Haha, testing things out? I get it! I'm here for real conversations when you're ready. What's actually going on?",
        "Random typing? Been there! 😄 But seriously, I'm here to listen to whatever's on your mind.",
        "I see you're just messing around a bit! That's totally fine. When you want to chat about something real, I'm all ears."
      ];
      return firstRandomResponses[Math.floor(Math.random() * firstRandomResponses.length)];
    } else if (randomTestCount > 2) {
      const persistentRandomResponses = [
        "I notice you're sending a lot of random text. Are you maybe having trouble figuring out what to say? That's completely normal - sometimes it's hard to start.",
        "It seems like you might be testing me or not sure how to begin. No judgment here! Sometimes people need time to warm up to talking.",
        "Are you feeling a bit nervous or unsure about what to share? That's totally okay. We can start with something simple - how are you feeling right now?"
      ];
      return persistentRandomResponses[Math.floor(Math.random() * persistentRandomResponses.length)];
    } else {
      const casualResponses = [
        "Testing, testing? 😊 I'm here for actual conversations about whatever you're dealing with.",
        "Keyboard smashing? I feel that sometimes! What's really going on in your head right now?",
        "Just playing around? Cool! But if something's actually bothering you, I'm here to listen."
      ];
      return casualResponses[Math.floor(Math.random() * casualResponses.length)];
    }
  }
  
  // Handle simple positive responses more intelligently
  if (lowerMessage.match(/^(good|fine|ok|okay|alright)$/)) {
    const deeperResponses = [
      "That's good to hear! But I'm curious - what's actually been going well for you?",
      "Glad things are okay! What's been on your mind lately though?",
      "Nice! Sometimes 'good' can mean different things though. How are you really feeling?",
      "That's great! What's been making things feel good for you?"
    ];
    return deeperResponses[Math.floor(Math.random() * deeperResponses.length)];
  }
  
  // Handle 'how are you' questions with more personality
  if (lowerMessage.includes('how are you') || lowerMessage.includes('how are u')) {
    const responses = [
      "I'm doing well, thanks for asking! More importantly though, how are YOU doing? What's going on with you?",
      "I'm good! But I'm way more interested in hearing about you. How's life treating you today?",
      "I'm solid, thanks! But enough about me - what's happening in your world? How are you feeling?",
      "I'm alright! Really though, I want to know about you. What's been on your mind lately?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
  
  // Real, supportive responses for different feelings with more variety
  if (lowerMessage.includes('anxiety') || lowerMessage.includes('anxious')) {
    const anxietyResponses = [
      "Ugh, anxiety is the worst. It can feel so overwhelming and exhausting. What's been triggering it for you lately?",
      "That sounds really tough. Anxiety can make everything feel so much bigger and scarier. Want to talk about what's been setting it off?",
      "I hear you. Anxiety can be absolutely draining. What's been making your mind race recently?"
    ];
    return anxietyResponses[Math.floor(Math.random() * anxietyResponses.length)];
  }
  
  if (lowerMessage.includes('stress') || lowerMessage.includes('overwhelm')) {
    const stressResponses = [
      "Ugh, stress is just the absolute worst. It's like everything piles up at once. What's been the biggest thing weighing on you?",
      "I totally get that. When stress hits, it feels like you're drowning in everything you have to do. What's been the hardest part?",
      "That overwhelmed feeling is so brutal. Like there's just too much and not enough time. What's been piling up for you?"
    ];
    return stressResponses[Math.floor(Math.random() * stressResponses.length)];
  }
  
  if (lowerMessage.includes('sad') || lowerMessage.includes('down') || lowerMessage.includes('depression')) {
    const sadnessResponses = [
      "I'm really glad you felt comfortable sharing that with me. Feeling down is so heavy and lonely. You don't have to carry this alone. What's been hurting the most?",
      "That takes courage to share. Depression can make everything feel gray and hopeless. I'm here with you in this. Want to talk about what's been hardest?",
      "Thank you for trusting me with this. Sadness can feel so isolating and deep. You matter, and your feelings are valid. What's been weighing on your heart?"
    ];
    return sadnessResponses[Math.floor(Math.random() * sadnessResponses.length)];
  }
  
  // For unclear messages, be more engaging and varied
  if (lowerMessage.includes('ntg') || lowerMessage.includes('nothing') || lowerMessage.includes('nm')) {
    const nothingResponses = [
      "Nothing much? I get that. Sometimes it's just one of those days where everything feels... meh. Anything lurking under the surface though?",
      "Fair enough! Those quiet days can actually be nice sometimes. How's your headspace been though? Anything bouncing around in there?",
      "I hear you. Sometimes 'nothing' days are actually the most peaceful. But how are you feeling underneath it all?"
    ];
    return nothingResponses[Math.floor(Math.random() * nothingResponses.length)];
  }
  
  // General supportive response for unclear input - more varied and engaging
  const generalResponses = [
    "I'm here and listening. Sometimes it's hard to put feelings into words, but I'm here for whatever you're going through.",
    "I can sense you might have something on your mind. Take your time - I'm here to listen to whatever you want to share.",
    "Not sure what to say? That's totally okay. Sometimes feelings are complicated. How are you actually doing right now?",
    "I'm here for whatever's going on with you. Whether it's big or small, I want to hear about it. What's on your mind?"
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
  
  // Send a more natural welcome message
  const welcomeStarters = [
    "Hey! I'm here to listen and support you. What's your name?",
    "Hi there! I'm glad you reached out. How are you doing today?",
    "Hey! Thanks for stopping by. I'm here for whatever you want to talk about.",
    "Hi! I'm here to listen - whether you're having a good day or a tough one. How are you feeling?"
  ];
  
  const welcomeMessage = welcomeStarters[Math.floor(Math.random() * welcomeStarters.length)];
  
  // Send the welcome message immediately
  socket.emit('bot-message', {
    message: welcomeMessage,
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