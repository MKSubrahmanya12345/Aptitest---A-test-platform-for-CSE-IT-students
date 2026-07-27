import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import Stripe from 'stripe';
import pool from '../config/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil' as any,
});

const HARD_60_PRICE_PAISE = 5000;
const HARD_60_TEST_TYPE = 'hard_60';

export const createPaymentIntent = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { idempotencyKey } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!idempotencyKey) return res.status(400).json({ message: 'idempotencyKey is required' });

    const conn = await pool.getConnection();
    try {
        const [existing]: any = await conn.execute(
            `SELECT id, status, stripe_payment_intent_id FROM payments WHERE idempotency_key = ? AND user_id = ?`,
            [idempotencyKey, userId]
        );

        if (existing.length > 0) {
            const row = existing[0];
            if (row.status === 'succeeded') {
                return res.json({ alreadyPaid: true, clientSecret: null });
            }
            if (row.stripe_payment_intent_id) {
                const pi = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id);
                return res.json({ clientSecret: pi.client_secret, alreadyPaid: false });
            }
        }

        const paymentIntent = await stripe.paymentIntents.create(
            {
                amount: HARD_60_PRICE_PAISE,
                currency: 'inr',
                metadata: { userId: String(userId), testType: HARD_60_TEST_TYPE },
            },
            { idempotencyKey }
        );

        await conn.execute(
            `INSERT INTO payments (user_id, idempotency_key, stripe_payment_intent_id, amount_paise, currency, test_type, status)
       VALUES (?, ?, ?, ?, 'inr', ?, 'pending')
       ON DUPLICATE KEY UPDATE stripe_payment_intent_id = VALUES(stripe_payment_intent_id)`,
            [userId, idempotencyKey, paymentIntent.id, HARD_60_PRICE_PAISE, HARD_60_TEST_TYPE]
        );

        return res.json({ clientSecret: paymentIntent.client_secret, alreadyPaid: false });
    } catch (err: any) {
        console.error('createPaymentIntent error:', err);
        return res.status(500).json({ message: err.message || 'Payment intent creation failed' });
    } finally {
        conn.release();
    }
};

export const confirmPayment = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { paymentIntentId } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!paymentIntentId) return res.status(400).json({ message: 'paymentIntentId is required' });

    const conn = await pool.getConnection();
    try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (pi.status !== 'succeeded') {
            return res.status(402).json({ message: `Payment not completed. Status: ${pi.status}` });
        }

        await conn.execute(
            `UPDATE payments SET status = 'succeeded', updated_at = NOW()
       WHERE stripe_payment_intent_id = ? AND user_id = ?`,
            [paymentIntentId, userId]
        );

        return res.json({ success: true, message: 'Payment confirmed. Hard 60 access granted!' });
    } catch (err: any) {
        console.error('confirmPayment error:', err);
        return res.status(500).json({ message: err.message || 'Payment confirmation failed' });
    } finally {
        conn.release();
    }
};

export const checkPaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const conn = await pool.getConnection();
    try {
        const [rows]: any = await conn.execute(
            `SELECT id FROM payments WHERE user_id = ? AND test_type = ? AND status = 'succeeded' LIMIT 1`,
            [userId, HARD_60_TEST_TYPE]
        );

        return res.json({ hasPaid: rows.length > 0 });
    } catch (err: any) {
        console.error('checkPaymentStatus error:', err);
        return res.status(500).json({ message: 'Failed to check payment status' });
    } finally {
        conn.release();
    }
};
