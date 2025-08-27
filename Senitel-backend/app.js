import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import {connectToDatabase} from './database/mongodb.js';
import { connectRedis } from './database/redis.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import crawlerRoutes from './routes/crawler.routes.js';

const app = express();
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/crawler', crawlerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
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

app.listen(PORT, async () => {
  try {
    await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    await connectRedis();
    console.log(`🚀 SentinelAI Backend running on port ${PORT}`);
   
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
});

export default app;