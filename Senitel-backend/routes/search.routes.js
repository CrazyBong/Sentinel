import express from 'express';
import {
  universalSearch,
  quickSearch,
  findSimilarContent,
  detectPatterns,
  searchTweets,
  getSearchHistory,
  getPopularSearches,
  getSearchAnalytics
} from '../controllers/search.controllers.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Universal search
router.post('/universal', authMiddleware, universalSearch);

// Quick search for autocomplete
router.get('/quick', authMiddleware, quickSearch);

// Advanced tweet search
router.get('/tweets', authMiddleware, searchTweets);

// Find similar content
router.post('/similar', authMiddleware, findSimilarContent);

// Pattern detection
router.get('/patterns', authMiddleware, detectPatterns);

// Search history
router.get('/history', authMiddleware, getSearchHistory);

// Popular searches
router.get('/popular', authMiddleware, getPopularSearches);

// Search analytics
router.get('/analytics', authMiddleware, getSearchAnalytics);

export default router;