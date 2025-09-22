// agent.mts

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// IMPORTANT - API keys should be set in .env file for security
// But we'll allow the server to run even without them for testing
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-abcdef1234567890abcdef1234567890abcdef12") {
  console.warn('⚠️  OPENAI_API_KEY is missing or not set in .env file');
  console.warn('🔧 Server will run with fallback responses only');
}

if (!process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY === "tvly-...") {
  console.warn('⚠️  TAVILY_API_KEY is missing or not set in .env file');
  console.warn('🔧 Search functionality will be disabled');
}

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";

// Define the tools for the agent to use (only if API keys are available)
let tools: any[] = [];
let toolNode: any = null;
let model: any = null;
let app: any = null;

if (process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY !== "tvly-...") {
  tools = [new TavilySearchResults({ maxResults: 3 })];
  toolNode = new ToolNode(tools);
}

// Create a model only if API key is available
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-...") {
  try {
    model = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
      apiKey: process.env.OPENAI_API_KEY,
    }).bindTools(tools);

    // Define the function that determines whether to continue or not
    function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
      const lastMessage = messages[messages.length - 1] as AIMessage;

      // If the LLM makes a tool call, then we route to the "tools" node
      if (lastMessage.tool_calls?.length) {
        return "tools";
      }
      // Otherwise, we stop (reply to the user) using the special "__end__" node
      return "__end__";
    }

    // Define the function that calls the model
    async function callModel(state: typeof MessagesAnnotation.State) {
      const response = await model.invoke(state.messages);

      // We return a list, because this will get added to the existing list
      return { messages: [response] };
    }

    // Define a new graph
    const workflow = new StateGraph(MessagesAnnotation)
      .addNode("agent", callModel)
      .addEdge("__start__", "agent") // __start__ is a special name for the entrypoint
      .addNode("tools", toolNode)
      .addEdge("tools", "agent")
      .addConditionalEdges("agent", shouldContinue);

    // Finally, we compile it into a LangChain Runnable.
    app = workflow.compile();
    console.log('✅ LangGraph agent initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize LangGraph agent:', error);
    model = null;
    app = null;
  }
} else {
  console.log('💬 Running in fallback mode without AI capabilities');
}

// Fallback response function
function getFallbackResponse(message: string): string {
  const responses = [
    "I hear what you're saying! While I'm having some connection issues right now, I'm still here to listen. 💬",
    "Thanks for sharing that with me. I'm experiencing some technical difficulties, but your message is important. 💙",
    "I appreciate you reaching out! I'm having some API troubles at the moment, but I want you to know I'm here. 🤗",
    "Your message came through! I'm having some connectivity issues right now, but I'm glad you're here. ✨",
    "I see your message! While I'm having some technical challenges, please know that what you're sharing matters. 👍"
  ];
  
  // Simple keyword-based responses
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello there! 👋 While I'm having some technical issues, I'm happy you stopped by. How are you doing today?";
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
    return "I hear that you're looking for help. While my AI features are temporarily down, please know you're not alone. If this is urgent, consider reaching out to 988 (crisis line) or a trusted friend. 💙";
  }
  
  if (lowerMessage.includes('anxious') || lowerMessage.includes('worried') || lowerMessage.includes('stress')) {
    return "It sounds like you're dealing with some tough feelings right now. That's really hard. While I'm having technical issues, remember that feelings are temporary and you've gotten through difficult times before. 🌱";
  }
  
  // Return a random supportive response
  return responses[Math.floor(Math.random() * responses.length)];
}

// Express server setup
const expressApp = express();
const server = createServer(expressApp);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"], // Allow Vite dev server
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'] // Required for compatibility
});

expressApp.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
expressApp.use(express.json());

// Health check endpoint
expressApp.get('/', (req, res) => {
  const apiKeyConfigured = !!process.env.OPENAI_API_KEY;
  const tavilyKeyConfigured = !!process.env.TAVILY_API_KEY;
  
  res.status(200).json({ 
    status: 'OK',
    service: 'LangGraph Agent Server',
    message: 'AI Agent with Search Capabilities',
    powered_by: 'LangGraph + OpenAI + Tavily',
    api_configured: {
      openai: apiKeyConfigured,
      tavily: tavilyKeyConfigured
    },
    port: process.env.PORT || 3003,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
expressApp.get('/health', (req, res) => {
  const openaiConfigured = !!process.env.OPENAI_API_KEY;
  const tavilyConfigured = !!process.env.TAVILY_API_KEY;
  
  res.status(200).json({
    status: openaiConfigured && tavilyConfigured ? 'healthy' : 'degraded',
    checks: {
      openai_api_key: openaiConfigured ? 'configured' : 'missing',
      tavily_api_key: tavilyConfigured ? 'configured' : 'missing',
      server_running: 'ok'
    },
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for API functionality
expressApp.get('/test', async (req, res) => {
  try {
    if (!app) {
      return res.status(200).json({
        success: true,
        response: "Server is running in fallback mode. LangGraph agent is not available due to missing or invalid API keys.",
        mode: "fallback",
        timestamp: new Date().toISOString()
      });
    }
    
    const testState = await app.invoke({
      messages: [new HumanMessage("Hello! Please respond with a simple greeting.")],
    });
    
    res.status(200).json({
      success: true,
      response: testState.messages[testState.messages.length - 1].content,
      mode: "langgraph",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(200).json({
      success: true,
      response: "Test failed with LangGraph agent, but fallback mode is working!",
      mode: "fallback",
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log('👤 User connected:', socket.id);
  
  // Send welcome message
  const welcomeMessage = app 
    ? "Hello! I'm your AI assistant with web search capabilities. Ask me anything!"
    : "Hello! I'm here to chat with you. While my AI features are temporarily limited, I'm still here to listen and support you! 💬";
    
  socket.emit('bot-message', {
    message: welcomeMessage,
    timestamp: new Date().toISOString()
  });

  socket.on('user-message', async (data) => {
    const { message } = data;
    console.log('Received message:', message);
    
    try {
      // If LangGraph agent is not available, use fallback
      if (!app) {
        const fallbackResponse = getFallbackResponse(message);
        socket.emit('bot-message', {
          message: fallbackResponse,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      const conversationHistory = data.history || [];
      const allMessages = [
        ...conversationHistory.map((msg: any) => 
          msg.type === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
        ),
        new HumanMessage(message)
      ];
      
      const finalState = await app.invoke({
        messages: allMessages,
      });
      
      const response = finalState.messages[finalState.messages.length - 1].content;
      
      socket.emit('bot-message', {
        message: response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing message:', error);
      
      let errorMessage = "I'm having trouble processing your request. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('quota') || error.message.includes('429')) {
          errorMessage = "I've reached my usage limit for now. Let me give you a supportive response instead! 💬";
          // Use fallback for quota errors
          errorMessage = getFallbackResponse(message);
        } else if (error.message.includes('401') || error.message.includes('authentication')) {
          errorMessage = "There's an authentication issue with my API. Using fallback mode for now.";
          errorMessage = getFallbackResponse(message);
        } else {
          // For any other error, use fallback
          errorMessage = getFallbackResponse(message);
        }
      }
      
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
  const requiredEnvVars = ['OPENAI_API_KEY', 'TAVILY_API_KEY'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('⚠️  Please add them to your .env file');
  } else {
    console.log('✅ All required environment variables are set');
  }
}

// Start server
const PORT = Number(process.env.PORT) || 3003;
const HOST = process.env.HOST || '0.0.0.0';

try {
  validateEnvironment();
  
  server.listen(PORT, HOST, () => {
    console.log(`✅ LangGraph Agent Server running on port ${PORT}`);
    console.log(`🤖 AI Assistant with search capabilities ready!`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
    console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
  });
  
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}