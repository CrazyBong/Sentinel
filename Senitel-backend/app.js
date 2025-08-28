import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import {connectToDatabase} from './database/mongodb.js';
import { connectRedis } from './database/redis.js';
import socketService from './services/socketService.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import crawlerRoutes from './routes/crawler.routes.js';
import aiRoutes from './routes/ai.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import evidenceRoutes from './routes/evidence.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import alertRoutes from './routes/alert.routes.js';
import searchRoutes from './routes/search.routes.js';


const app = express();
const server = http.createServer(app); // Create HTTP server for Socket.IO
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use(limiter);

// Body parsing middleware with better error handling
app.use(express.json({ 
  limit: '10mb',
  strict: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
app.use(morgan('combined'));

// Custom JSON error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON Parse Error:', err.message);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format in request body',
      error: 'Please check your JSON syntax'
    });
  }
  next(err);
});

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/search', searchRoutes); 


// Health check with Socket.IO status
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeConnections: socketService.getActiveUsersCount()
  });
});

// Socket.IO status endpoint
app.get('/api/socket/status', (req, res) => {
  res.json({
    success: true,
    data: socketService.getSystemStats()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server with Socket.IO
server.listen(PORT, async () => {
  try {
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    await connectRedis();
    
    // Initialize Socket.IO
    socketService.init(server);
    
    console.log(`🚀 SentinelAI Backend running on port ${PORT}`);
    console.log('-----------------------------------');
    console.log('  Environment:', process.env.NODE_ENV);
    console.log('  MongoDB URI:', process.env.MONGODB_URI);
    console.log('  Redis URI:', process.env.REDIS_URL);
    console.log('  Frontend URL:', process.env.FRONTEND_URL);
    console.log('-----------------------------------');
   
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
});

export default app;