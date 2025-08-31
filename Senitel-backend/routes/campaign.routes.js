import express from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaign,
  archiveCampaign,
  addCampaignNote,
  getCampaignAnalytics,
  getCampaignNotes,
  updateCampaignNote,
  deleteCampaignNote,
  getCampaignStats,
  updateCampaignStatus
} from '../controllers/campaign.controllers.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = express.Router();

// Campaign CRUD
router.post('/', authMiddleware, createCampaign);
router.get('/', authMiddleware, getCampaigns);
router.get('/:id', authMiddleware, getCampaignById);
router.put('/:id', authMiddleware, updateCampaign);
router.delete('/:id', authMiddleware, archiveCampaign);

// Campaign status updates
router.patch('/:id/status', authMiddleware, updateCampaignStatus);

// Campaign notes
router.post('/:id/notes', authMiddleware, addCampaignNote);
router.get('/:id/notes', authMiddleware, getCampaignNotes);
router.put('/:id/notes/:noteId', authMiddleware, updateCampaignNote);
router.delete('/:id/notes/:noteId', authMiddleware, deleteCampaignNote);

// Campaign analytics and stats
router.get('/:id/analytics', authMiddleware, getCampaignAnalytics);
router.get('/:id/stats', authMiddleware, getCampaignStats);

export default router;