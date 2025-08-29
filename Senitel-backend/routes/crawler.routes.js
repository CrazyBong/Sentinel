import express from 'express';
import {
  initializeCrawler,
  loginToTwitter,
  crawlTweets,
  getCrawledTweets,
  getCrawlerStatus,
  closeCrawler
} from '../controllers/crawler.controllers.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Initialize crawler
router.post('/init', authMiddleware, initializeCrawler);

// Login to Twitter
router.post('/login', authMiddleware, loginToTwitter);

// Crawl tweets
router.post('/crawl', authMiddleware, crawlTweets);

// Get crawled tweets
router.get('/tweets', authMiddleware, getCrawledTweets);

// Get crawler status
router.get('/status', authMiddleware, getCrawlerStatus);

// Close crawler
router.post('/close', authMiddleware, closeCrawler);

export default router;