import express from 'express';
import {
  analyzeTweet,
  analyzeBatch,
  generateReport,
  chatWithAI,
  detectPatterns,
  getAnalysisSummary
} from '../controllers/ai.controllers.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Tweet analysis endpoints
router.post('/analyze-tweet', authMiddleware, analyzeTweet);
router.post('/analyze-batch', authMiddleware, analyzeBatch);

// Pattern detection
router.get('/patterns/:campaignId', authMiddleware, detectPatterns);

// Report generation
router.post('/generate-report/:campaignId', authMiddleware, generateReport);

// AI chat interface
router.post('/chat', authMiddleware, chatWithAI);

// Analysis summary for dashboard
router.get('/summary', authMiddleware, getAnalysisSummary);

export default router;