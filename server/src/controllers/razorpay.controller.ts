import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import pool from '../config/db';
import { testTemplateService } from '../services/testTemplate.service';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const HARD_60_PRICE_PAISE = 100; // ₹1.00
const HARD_60_TEST_TYPE = 'hard_60';

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { testType, templateId, paymentMethod } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const conn = await pool.getConnection();
  try {
    // Get user details
    const [userRows]: any = await conn.execute(
      'SELECT name, email FROM users WHERE id = ?',
      [userId]
    );
    const user = userRows[0];

    // Determine price
    let actualTestType = testType || HARD_60_TEST_TYPE;
    let pricePaise = HARD_60_PRICE_PAISE;

    if (templateId && templateId !== 'hard_60') {
      const templateData = await testTemplateService.getTemplateById(parseInt(templateId));
      if (templateData && templateData.is_paid) {
        actualTestType = `template_${templateId}`;
        pricePaise = templateData.price_paise || HARD_60_PRICE_PAISE;
      }
    }

    // Check if already paid
    const [alreadyPaid]: any = await conn.execute(
      `SELECT id FROM payments WHERE user_id = ? AND test_type = ? AND status = 'succeeded' LIMIT 1`,
      [userId, actualTestType]
    );

    if (alreadyPaid.length > 0) {
      return res.json({ alreadyPaid: true });
    }

    // Create Razorpay order
    const options = {
      amount: pricePaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: String(userId),
        testType: actualTestType,
        templateId: templateId || '',
        paymentMethod: paymentMethod || 'upi', // upi or card
      },
    };

    const order = await razorpay.orders.create(options);

    // Store order in database
    await conn.execute(
      `INSERT INTO payments (user_id, razorpay_order_id, amount_paise, currency, test_type, status, payment_method)
       VALUES (?, ?, ?, 'INR', ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE razorpay_order_id = VALUES(razorpay_order_id), status = 'pending'`,
      [userId, order.id, pricePaise, actualTestType, paymentMethod || 'upi']
    );

    return res.json({
      orderId: order.id,
      amount: pricePaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      userName: user.name,
      userEmail: user.email,
      alreadyPaid: false,
    });
  } catch (err: any) {
    console.error('createOrder error:', err);
    return res.status(500).json({ message: err.message || 'Order creation failed' });
  } finally {
    conn.release();
  }
};

export const verifyPayment = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: 'Missing payment verification details' });
  }

  const conn = await pool.getConnection();
  try {
    // Verify signature
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    const isAuthentic = expectedSignature === razorpaySignature;

    if (!isAuthentic) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Update payment status
    await conn.execute(
      `UPDATE payments SET status = 'succeeded', razorpay_payment_id = ?, updated_at = NOW()
       WHERE razorpay_order_id = ? AND user_id = ?`,
      [razorpayPaymentId, razorpayOrderId, userId]
    );

    return res.json({ success: true, message: 'Payment verified successfully!' });
  } catch (err: any) {
    console.error('verifyPayment error:', err);
    return res.status(500).json({ message: err.message || 'Payment verification failed' });
  } finally {
    conn.release();
  }
};
