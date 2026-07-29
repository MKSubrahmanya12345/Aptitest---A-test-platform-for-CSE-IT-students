import express from 'express';

import { login, signup, forgotPassword, verifyResetToken, resetPassword, verifyEmail } from "../controllers/auth.controller";

const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);

// Password reset routes
router.post("/forgot-password", forgotPassword);
router.get("/verify-reset-token", verifyResetToken);
router.post("/reset-password", resetPassword);

// Email verification routes
router.get("/verify-email", verifyEmail);

export default router;