import express from 'express';
import {
  reviewController,
  getStudentById,
  getStudents,
  updateStudentStatus,
  getStudentHistory
} from '../controllers/review.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

const adminAuth = [authenticateToken, requireAdmin];

// Apply admin middleware to all routes below
router.use(adminAuth);

router.get('/review-pending', reviewController.getPending);
router.put('/review-pending/:id', reviewController.updatePending);
router.post('/review-pending/:id/approve', reviewController.approvePending);
router.post('/review-pending/:id/reject', reviewController.rejectPending);
router.get('/questions', reviewController.getQuestions);
router.get('/stats', reviewController.getStats);

router.get('/view-students', getStudents);
router.get('/view-students/:id', getStudentById);
router.put('/view-students/:id/status', updateStudentStatus);
router.get('/view-students/:id/history', getStudentHistory);

export default router;