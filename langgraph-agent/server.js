// server.js - Simple server for testing connection

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK',
    service: 'Simple Test Server',
    message: 'Connection working!',
    port: 3003,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    checks: {
      server_running: 'ok'
    },
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);
  
  // Send welcome message
  socket.emit('bot-message', {
    message: "Hello! Test server is working. I can receive your messages!",
    timestamp: new Date().toISOString()
  });

  socket.on('user-message', (data) => {
    const { message } = data;
    console.log('Received message:', message);
    
    // Simple echo response for testing
    socket.emit('bot-message', {
      message: `I received: "${message}". The connection is working fine! (This is a test response)`,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = 3003;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`✅ Test Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
  console.log('🧪 This is a test server to fix connection issues');
});