import express from 'express';
import { testController } from '../controllers/test.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All test/student routes require authentication
router.use(authenticateToken);

router.post('/test/start', testController.start);
router.post('/test/answer', testController.answer);
router.post('/test/view-question', testController.viewQuestion);
router.post('/test/submit', testController.submit);
router.get('/test/session/:id', testController.getSession);
router.get('/test/history', testController.getHistory);
router.post('/test/reattempt/:id', testController.reattempt);
router.get('/leaderboard', testController.getLeaderboard);

export default router;
