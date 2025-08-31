import express from 'express';
import { 
  getAlerts, 
  getAlertById, 
  updateAlertStatus, 
  getAlertStats 
} from '../controllers/alert.controllers.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // Require authentication

router.get('/', getAlerts);
router.get('/stats', getAlertStats);
router.get('/:id', getAlertById);
router.patch('/:id/status', updateAlertStatus);

export default router;