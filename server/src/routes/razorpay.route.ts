import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { createOrder, verifyPayment } from '../controllers/razorpay.controller';

const router = express.Router();

router.post('/razorpay/create-order', authenticateToken, createOrder);
router.post('/razorpay/verify', authenticateToken, verifyPayment);

export default router;
