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
import crawlerManager from './services/crawlerManager.js'; // Add this import

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
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// Health check with Socket.IO status and crawler status
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeConnections: socketService.getActiveUsersCount(),
    crawler: crawlerManager.getStatus() // Add crawler status
  });
});

// Socket.IO status endpoint
app.get('/api/socket/status', (req, res) => {
  res.json({
    success: true,
    data: socketService.getSystemStats()
  });
});

// Crawler status endpoint
app.get('/api/crawler/status', (req, res) => {
  res.json({
    success: true,
    data: crawlerManager.getStatus()
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

// Initialize services function
async function initializeServices() {
  try {
    // Connect to databases first
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    
    await connectRedis();
    console.log('✅ Connected to Redis');
    
    // Initialize Socket.IO
    socketService.init(server);
    console.log('✅ Socket.IO initialized');
    
    // Set socket service reference in crawler manager
    crawlerManager.setSocketService(socketService);
    console.log('✅ Crawler Manager linked to Socket.IO');
    
    // Start crawler auto-initialization (with delay for everything to be ready)
    setTimeout(async () => {
      try {
        console.log('🚀 Starting Crawler Manager auto-initialization...');
        await crawlerManager.startAutoInitialization();
      } catch (crawlerError) {
        console.error('❌ Crawler initialization failed:', crawlerError);
        console.log('⚠️ You can manually initialize the crawler via API endpoints');
      }
    }, 3000); // 3 second delay to ensure everything is ready
    
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    throw error;
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  try {
    // Close crawler manager first
    await crawlerManager.close();
    console.log('✅ Crawler Manager closed');
    
    // Close server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });
    
    // Force exit after 30 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server with all services
server.listen(PORT, async () => {
  console.log(`🚀 SentinelAI Backend running on port ${PORT}`);
  console.log('-----------------------------------');
  console.log('  Environment:', process.env.NODE_ENV || 'development');
  console.log('  MongoDB URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');
  console.log('  Redis URI:', process.env.REDIS_URL ? '✅ Set' : '❌ Not set');
  console.log('  Frontend URL:', process.env.FRONTEND_URL || 'http://localhost:5173');
  console.log('  Twitter Username:', process.env.TWITTER_USERNAME ? '✅ Set' : '❌ Not set');
  console.log('  Twitter Password:', process.env.TWITTER_PASSWORD ? '✅ Set' : '❌ Not set');
  console.log('-----------------------------------');
  
  try {
    await initializeServices();
    console.log('🎉 All services initialized successfully!');
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    // Don't exit - let the server run without some services
  }
});

export default app;