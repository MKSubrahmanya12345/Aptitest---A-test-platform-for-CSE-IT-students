import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { createPaymentIntent, confirmPayment, checkPaymentStatus } from '../controllers/payment.controller';

const router = express.Router();

router.get('/payment/status', authenticateToken, checkPaymentStatus);
router.post('/payment/create-intent', authenticateToken, createPaymentIntent);
router.post('/payment/confirm', authenticateToken, confirmPayment);

export default router;