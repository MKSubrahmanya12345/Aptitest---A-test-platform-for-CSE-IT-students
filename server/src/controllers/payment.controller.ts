import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import Stripe from 'stripe';
import pool from '../config/db';
import { testTemplateService } from '../services/testTemplate.service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-06-30.basil' as any,
});

const HARD_60_PRICE_PAISE = 100; // ₹1.00 minimum for Stripe India
const HARD_60_TEST_TYPE = 'hard_60';

export const createPaymentIntent = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { idempotencyKey, testType, templateId } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!idempotencyKey) return res.status(400).json({ message: 'idempotencyKey is required' });

    const conn = await pool.getConnection();
    try {
        // Determine the actual test type and price
        let actualTestType = testType || HARD_60_TEST_TYPE;
        let pricePaise = HARD_60_PRICE_PAISE;
        let templateData = null;

        // If templateId is provided, fetch the template details
        if (templateId && templateId !== 'hard_60') {
            templateData = await testTemplateService.getTemplateById(parseInt(templateId));
            if (templateData && templateData.is_paid) {
                actualTestType = `template_${templateId}`;
                pricePaise = templateData.price_paise || HARD_60_PRICE_PAISE;
            }
        }

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

        // Check if user already paid for this test type
        const [alreadyPaid]: any = await conn.execute(
            `SELECT id FROM payments WHERE user_id = ? AND test_type = ? AND status = 'succeeded' LIMIT 1`,
            [userId, actualTestType]
        );

        if (alreadyPaid.length > 0) {
            return res.json({ alreadyPaid: true, clientSecret: null });
        }

        const paymentIntent = await stripe.paymentIntents.create(
            {
                amount: pricePaise,
                currency: 'inr',
                metadata: { userId: String(userId), testType: actualTestType, templateId: templateId || '' },
            },
            { idempotencyKey }
        );

        await conn.execute(
            `INSERT INTO payments (user_id, idempotency_key, stripe_payment_intent_id, amount_paise, currency, test_type, status)
       VALUES (?, ?, ?, ?, 'inr', ?, 'pending')
       ON DUPLICATE KEY UPDATE stripe_payment_intent_id = VALUES(stripe_payment_intent_id)`,
            [userId, idempotencyKey, paymentIntent.id, pricePaise, actualTestType]
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
    const { testType } = req.query;
    
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const conn = await pool.getConnection();
    try {
        // If specific testType provided, check that; otherwise default to hard_60
        const checkTestType = testType || HARD_60_TEST_TYPE;
        
        const [rows]: any = await conn.execute(
            `SELECT id FROM payments WHERE user_id = ? AND test_type = ? AND status = 'succeeded' LIMIT 1`,
            [userId, checkTestType]
        );

        return res.json({ hasPaid: rows.length > 0, testType: checkTestType });
    } catch (err: any) {
        console.error('checkPaymentStatus error:', err);
        return res.status(500).json({ message: 'Failed to check payment status' });
    } finally {
        conn.release();
    }
};
