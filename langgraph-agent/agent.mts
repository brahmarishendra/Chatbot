// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Conversation memory to track context and avoid repetitive responses
const conversationMemory = new Map<string, { 
  lastResponses: string[],
  conversationStage: 'initial' | 'engaged' | 'deepening',
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

// Crisis detection function
function detectCrisis(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const crisisKeywords = [
    'suicide', 'kill myself', 'hurt myself', 'end it all', 
    'don\'t want to live', 'want to die', 'ending my life'
  ];
  return crisisKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Generate system prompt based on message type - NO HARDCODED RESPONSES
function generateSystemPrompt(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // Crisis situations get highest priority
  if (detectCrisis(userMessage)) {
    return `URGENT CRISIS RESPONSE: The user said something concerning about self-harm: "${userMessage}". You are a caring mental health crisis support friend. Respond with immediate concern and provide crisis resources. Say something like "I'm really worried about you right now. Your life matters. Please call 988 immediately or text HOME to 741741. Can you reach out to someone you trust?" Be caring but direct about their safety.`;
  }
  
  // Mental health topics
  if (lowerMessage.includes('anxiety') || lowerMessage.includes('stress') || lowerMessage.includes('overwhelm')) {
    return `You are a supportive mental health friend. The user shared: "${userMessage}" about anxiety/stress. Be genuinely supportive, validate their feelings, offer gentle encouragement. Sound like a caring friend, not a therapist. Keep responses natural and under 50 words.`;
  }
  
  if (lowerMessage.includes('sad') || lowerMessage.includes('down') || lowerMessage.includes('depression')) {
    return `You are a compassionate mental health friend. The user is feeling down: "${userMessage}". Be empathetic, let them know they're not alone, gently encourage them to share more if they want. Keep responses natural and supportive.`;
  }
  
  // Random/testing input - handle naturally
  if (userMessage.length > 5 && /^[a-z\s]+$/i.test(lowerMessage) && 
      !lowerMessage.match(/\b(hi|hey|hello|good|bad|sad|ok|fine|yes|no|help|stress|anxiety|tired|bye|thanks)\b/)) {
    return `The user sent random/gibberish text: "${userMessage}". Respond playfully and briefly like a confused friend. Say something like "uh... what?", "keyboard ok?", "you alright?", or "what's that?". Keep it under 10 words and natural.`;
  }
  
  // Greetings
  if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
    return `You are a warm mental health support friend. The user greeted you with: "${userMessage}". Respond naturally with a greeting and ask how they're feeling or what's on their mind. Be warm and engaging, not clinical. Keep it under 25 words.`;
  }
  
  // Default supportive conversation - ALWAYS route through LLM
  return `You are a caring mental health support friend. The user said: "${userMessage}". Respond naturally and warmly. Show genuine interest in their wellbeing. Be conversational, supportive, and authentic like texting a friend you care about. Keep responses under 50 words.`;
}

// Enhanced API key validation with specific error feedback
function validateApiKey(apiKey: string | undefined): { isValid: boolean; error?: string; type?: string } {
  if (!apiKey) {
    return {
      isValid: false,
      error: 'API key is missing from environment variables',
      type: 'MISSING'
    };
  }
  
  if (apiKey === 'your_gemini_api_key_here' || apiKey === 'your_actual_api_key_here') {
    return {
      isValid: false,
      error: 'API key is still set to placeholder value - please replace with actual key',
      type: 'PLACEHOLDER'
    };
  }
  
  if (apiKey.length < 10) {
    return {
      isValid: false,
      error: 'API key appears to be too short - please check the key format',
      type: 'INVALID_FORMAT'
    };
  }
  
  if (!apiKey.startsWith('AIza')) {
    return {
      isValid: false,
      error: 'Gemini API keys should start with "AIza" - please verify this is a Google Gemini API key',
      type: 'WRONG_FORMAT'
    };
  }
  
  return { isValid: true };
}

// MAIN FUNCTION: Process ALL messages through Gemini API - NO FALLBACKS TO CANNED RESPONSES
export async function processMessage(userMessage: string, threadId: string = "default"): Promise<string> {
  try {
    console.log('🔄 Processing ALL messages through Gemini API:', userMessage);
    
    // Enhanced API key validation
    const apiKeyValidation = validateApiKey(process.env.GEMINI_API_KEY);
    console.log('🔑 API Key validation:', apiKeyValidation);
    
    if (!apiKeyValidation.isValid) {
      console.error('🚨 API Key Validation Failed:', apiKeyValidation.error);
      console.error('🔧 Validation Type:', apiKeyValidation.type);
      
      // Provide specific guidance based on validation type
      switch (apiKeyValidation.type) {
        case 'MISSING':
          throw new Error('🔑 No API key found - please set GEMINI_API_KEY in your .env file');
        case 'PLACEHOLDER':
          throw new Error('🔑 Please replace the placeholder API key in .env with your actual Gemini API key from https://makersuite.google.com/app/apikey');
        case 'INVALID_FORMAT':
        case 'WRONG_FORMAT':
          throw new Error(`🔑 Invalid API key format - ${apiKeyValidation.error}`);
        default:
          throw new Error('🔑 API key validation failed - please check your configuration');
      }
    }
    
    console.log('🔑 Using API Key:', process.env.GEMINI_API_KEY?.substring(0, 10) + '...');
    
    // Generate appropriate system prompt for ANY input
    const systemPrompt = generateSystemPrompt(userMessage.trim());
    console.log('✨ Generated system prompt:', systemPrompt.substring(0, 100) + '...');
    
    const response = await callGeminiAPI(systemPrompt, threadId);
    
    // Update conversation memory to avoid repetition
    updateConversationMemory(threadId, response);
    
    console.log('✅ Successfully processed through LLM');
    return response;
    
  } catch (error) {
    console.error('❌ LLM processing failed:', error);
    
    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error('📋 Error details:', {
        message: error.message,
        stack: error.stack,
        apiKey: process.env.GEMINI_API_KEY ? 'Present' : 'Missing',
        timestamp: new Date().toISOString()
      });
    }
    
    // Return appropriate error message based on error type
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw error; // Re-throw specific API key errors
      } else if (error.message.includes('quota')) {
        throw new Error('📊 API quota exceeded - please upgrade your Gemini API plan or wait for quota reset');
      }
    }
    
    throw new Error('🚫 AI service temporarily unavailable. Please try again in a moment.');
  }
}

// Update conversation memory to track responses and avoid repetition
function updateConversationMemory(threadId: string, response: string): void {
  if (!conversationMemory.has(threadId)) {
    conversationMemory.set(threadId, {
      lastResponses: [],
      conversationStage: 'initial',
      lastActivity: new Date()
    });
  }
  
  const memory = conversationMemory.get(threadId)!;
  memory.lastActivity = new Date();
  
  // Store key phrases for repetition detection
  const keyPhrase = response.trim().toLowerCase().replace(/[!?.,]/g, '').split(' ').slice(0, 4).join(' ');
  memory.lastResponses.push(keyPhrase);
  memory.lastResponses = memory.lastResponses.slice(-5); // Keep last 5 key phrases
  
  console.log('🧠 Updated memory with key phrase:', keyPhrase);
}

// Call Gemini API with proper temperature and configuration
async function callGeminiAPI(systemPrompt: string, threadId: string): Promise<string> {
  try {
    console.log('🚀 Making request to Gemini API...');
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: systemPrompt
        }]
      }],
      generationConfig: {
        temperature: 0.8, // Set to 0.8 for varied, natural responses
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1000,
        candidateCount: 1
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
    };
    
    console.log('📦 Sending request to Gemini API with temperature=0.8...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📊 API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      
      // Parse error for better debugging
      try {
        const errorJson = JSON.parse(errorText);
        console.error('📋 Parsed API Error:', {
          code: errorJson.error?.code,
          message: errorJson.error?.message,
          status: errorJson.error?.status
        });
        
        // Handle quota exhaustion specifically
        if (errorJson.error?.code === 429) {
          throw new Error(`🚫 API quota exhausted. ${errorJson.error.message}`);
        }
      } catch (parseError) {
        console.error('⚠️ Could not parse error response');
      }
      
      throw new Error(`😱 Gemini API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ API Success - received data structure:', Object.keys(data));
    
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      console.error('❌ No content in API response:', data);
      throw new Error('💭 No content received from Gemini API');
    }

    console.log('✨ Returning response from Gemini API');
    console.log('💬 Response preview:', content.substring(0, 50) + '...');
    return content.trim();
  } catch (error) {
    console.error('🔴 Gemini API Error Details:', error);
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
  const apiKeyConfigured = !!process.env.GEMINI_API_KEY;
  
  res.status(200).json({ 
    status: 'OK',
    service: 'MindBuddy Agent Server',
    message: 'Youth Mental Wellness Support API',
    powered_by: 'Google Gemini API',
    api_configured: apiKeyConfigured,
    fallback_mode: !apiKeyConfigured,
    port: process.env.PORT || 3003,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    deployment_ready: apiKeyConfigured
  });
});

// Additional health check endpoint with detailed status
app.get('/health', (req, res) => {
  const apiKeyConfigured = !!process.env.GEMINI_API_KEY;
  const healthStatus = {
    status: apiKeyConfigured ? 'healthy' : 'degraded',
    checks: {
      gemini_api_key: apiKeyConfigured ? 'configured' : 'missing',
      server_running: 'ok',
      memory_usage: process.memoryUsage(),
      uptime_seconds: process.uptime()
    },
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    fallback_mode: !apiKeyConfigured,
    warnings: apiKeyConfigured ? [] : ['API key not configured - running in degraded mode']
  };
  
  // Return 200 for basic health, but include degraded status info
  res.status(200).json(healthStatus);
});

// API status endpoint with enhanced diagnostics
app.get('/api/status', (req, res) => {
  const apiKeyValidation = validateApiKey(process.env.GEMINI_API_KEY);
  
  res.status(200).json({
    api: 'running',
    gemini_configured: apiKeyValidation.isValid,
    api_key_status: {
      present: !!process.env.GEMINI_API_KEY,
      validation: apiKeyValidation,
      preview: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'Not set'
    },
    timestamp: new Date().toISOString()
  });
});

// API key testing endpoint for troubleshooting
app.get('/api/test-key', async (req, res) => {
  try {
    const apiKeyValidation = validateApiKey(process.env.GEMINI_API_KEY);
    
    if (!apiKeyValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'API key validation failed',
        details: apiKeyValidation,
        guidance: {
          missing: 'Set GEMINI_API_KEY in your .env file',
          placeholder: 'Replace placeholder with actual key from https://makersuite.google.com/app/apikey',
          format: 'Ensure key starts with "AIza" and is the correct length'
        }
      });
    }
    
    // Test actual API call with a simple request
    console.log('🧪 Testing API key with simple request...');
    const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Hello! This is a test message to verify the API key works. Please respond with "API key is working!"'
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 50
        }
      })
    });
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('🚨 API test failed:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        return res.status(testResponse.status).json({
          success: false,
          error: 'API key test failed',
          api_response: {
            status: testResponse.status,
            message: errorJson.error?.message || 'Unknown API error',
            code: errorJson.error?.code
          },
          guidance: {
            400: 'Invalid API key format or key not activated',
            403: 'API key lacks required permissions or quota exceeded',
            429: 'Rate limit exceeded or quota exhausted'
          }[testResponse.status] || 'Check API key configuration'
        });
      } catch (parseError) {
        return res.status(testResponse.status).json({
          success: false,
          error: 'API test failed with unparseable response',
          raw_response: errorText
        });
      }
    }
    
    const testData = await testResponse.json();
    const testContent = testData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    res.status(200).json({
      success: true,
      message: 'API key is working correctly!',
      test_response: testContent,
      api_key_preview: process.env.GEMINI_API_KEY?.substring(0, 10) + '...',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🚨 API key test error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal error during API test',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
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
  console.log('👤 User connected:', socket.id);
  
  // Generate a dynamic welcome message using the LLM - NO HARDCODED MESSAGES
  try {
    console.log('🚀 Generating welcome message via Gemini API...');
    const welcomePrompt = 'You are a caring mental health support friend. Generate a warm, brief welcome message for someone who just connected. Ask how they\'re feeling or what\'s on their mind. Stay under 30 words. Be natural and supportive.';
    const welcomeMessage = await callGeminiAPI(welcomePrompt, socket.id);
    
    console.log('✨ Welcome message generated by API:', welcomeMessage.substring(0, 50) + '...');
    
    socket.emit('bot-message', {
      message: welcomeMessage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to generate welcome message:', error);
    // Only use fallback if API completely fails
    socket.emit('bot-message', {
      message: "🤖 Connection established but AI is initializing. How are you feeling today?",
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

// Validate environment variables and provide deployment guidance
function validateEnvironment() {
  const requiredEnvVars = ['GEMINI_API_KEY'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('⚠️  For local development: Create a .env file with your API keys');
    console.warn('⚠️  For Render deployment: Set environment variables in Render dashboard');
    console.warn('⚠️  API calls will fail until environment variables are properly configured');
    
    // Check if we're in a deployment environment
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
      console.error('🚨 PRODUCTION ERROR: Missing required environment variables in deployment!');
      console.error('🔧 Please configure environment variables in your deployment platform');
    }
  } else {
    console.log('✅ All required environment variables are set');
    console.log('🚀 API integration ready for dynamic responses!');
  }
}

// Start server with proper error handling
const PORT = Number(process.env.PORT) || 3003;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for Render

try {
  validateEnvironment();
  
  const serverInstance = server.listen(PORT, HOST, () => {
    console.log(`✅ Server successfully started`);
    console.log(`🤖 MindBuddy Mental Wellness Chatbot running on port ${PORT}`);
    console.log(`🌐 Health check available at: http://localhost:${PORT}/health`);
    console.log('💙 Ready to provide youth mental health support!');
    console.log('✨ Now powered by Google Gemini API for dynamic responses!');
    console.log(`🔑 Gemini API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⚡ Server ready to accept connections on port ${PORT}`);
  });
  
  // Handle server errors with proper typing
  serverInstance.on('error', (error: NodeJS.ErrnoException) => {
    console.error('❌ Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      console.error('💡 Try a different port or kill the process using this port');
    } else if (error.code === 'EACCES') {
      console.error(`❌ Permission denied to bind to port ${PORT}`);
      console.error('💡 Try using a port number > 1024 or run with elevated privileges');
    }
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

// Handle uncaught exceptions with proper logging
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  // Give pending operations a chance to complete
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('🔍 Reason:', reason);
  if (reason instanceof Error) {
    console.error('📝 Error details:', {
      message: reason.message,
      stack: reason.stack,
      timestamp: new Date().toISOString()
    });
  }
  // Give pending operations a chance to complete
  setTimeout(() => process.exit(1), 1000);
});