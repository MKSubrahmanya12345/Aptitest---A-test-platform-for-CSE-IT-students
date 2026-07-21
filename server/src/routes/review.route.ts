import express from 'express';
import { reviewController, getStudentById, getStudents, updateStudentStatus, getStudentHistory } from '../controllers/review.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

const adminAuth = [authenticateToken, requireAdmin];

router.get('/review-pending', adminAuth, reviewController.getPending);
router.put('/review-pending/:id', adminAuth, reviewController.updatePending);
router.post('/review-pending/:id/approve', adminAuth, reviewController.approvePending);
router.post('/review-pending/:id/reject', adminAuth, reviewController.rejectPending);
router.get('/questions', adminAuth, reviewController.getQuestions);
router.get('/stats', adminAuth, reviewController.getStats);



router.get('/view-students', adminAuth, getStudents);
router.get('/view-students/:id', adminAuth, getStudentById);
router.put('/view-students/:id/status', adminAuth, updateStudentStatus);
router.get('/view-students/:id/history', adminAuth, getStudentHistory);

export default router;

