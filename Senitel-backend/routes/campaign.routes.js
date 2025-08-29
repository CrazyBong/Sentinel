import express from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  archiveCampaign,
  addCampaignNote,
  getCampaignAnalytics
} from '../controllers/campaign.controllers.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Campaign CRUD
router.post('/', authMiddleware, createCampaign);
router.get('/', authMiddleware, getCampaigns);
router.get('/:id', authMiddleware, getCampaignById);
router.put('/:id', authMiddleware, updateCampaign);
router.delete('/:id', authMiddleware, archiveCampaign);

// Campaign notes
router.post('/:id/notes', authMiddleware, addCampaignNote);

// Campaign analytics
router.get('/:id/analytics', authMiddleware, getCampaignAnalytics);

export default router;