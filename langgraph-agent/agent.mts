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

// Function to process user messages with mental wellness context using Gemini API
export async function processMessage(userMessage: string, threadId: string = "default") {
  try {
    // Always try Gemini API first (since we have a valid key)
    console.log('Processing message with Gemini API:', userMessage);
    return await getGeminiResponse(userMessage, threadId);
  } catch (error) {
    console.error('Gemini API failed, using fallback:', error);
    return getFallbackMentalWellnessResponse(userMessage);
  }
}

// Function to get response from Gemini API
async function getGeminiResponse(userMessage: string, threadId: string): Promise<string> {
  try {
    console.log('Making request to Gemini API...');
    console.log('API Key (first 10 chars):', process.env.GEMINI_API_KEY?.substring(0, 10));
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${YOUTH_MENTAL_WELLNESS_PROMPT}\n\nUser: ${userMessage}`
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

// Voice-optimized fallback responses
function getFallbackMentalWellnessResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();
  
  // Handle greetings
  if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
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
  
  // Voice-friendly short responses
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
  
  // General supportive response
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

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'MindBuddy Agent Server is running!', 
    message: 'Youth Mental Wellness Support API',
    powered_by: 'Google Gemini API',
    port: process.env.PORT || 3003
  });
});

// API endpoint for testing
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send welcome message
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
  });
});

// Start server
const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`🤖 MindBuddy Mental Wellness Chatbot running on http://localhost:${PORT}`);
  console.log('💙 Ready to provide youth mental health support!');
  console.log('✨ Now powered by Google Gemini API for dynamic responses!');
  console.log(`🔑 API Key configured: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}`);
});