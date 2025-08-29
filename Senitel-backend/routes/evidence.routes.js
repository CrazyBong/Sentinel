import express from 'express';
import { upload } from '../middlewares/upload.js';
import {
  uploadEvidence,
  getCampaignEvidence,
  getEvidenceById,
  updateEvidence,
  downloadEvidence,
  deleteEvidence,
  getEvidenceAnalytics
} from '../controllers/evidence.controllers.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Upload evidence
router.post('/upload/:campaignId', authMiddleware, upload.array('files', 10), uploadEvidence);

// Get campaign evidence
router.get('/campaign/:campaignId', authMiddleware, getCampaignEvidence);

// Get single evidence
router.get('/:id', authMiddleware, getEvidenceById);

// Update evidence metadata
router.put('/:id', authMiddleware, updateEvidence);

// Download evidence
router.get('/:id/download', authMiddleware, downloadEvidence);

// Delete evidence
router.delete('/:id', authMiddleware, deleteEvidence);

// Evidence analytics
router.get('/analytics/:campaignId', authMiddleware, getEvidenceAnalytics);

export default router;