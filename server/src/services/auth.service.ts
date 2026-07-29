import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';

import { userModel } from "../models/user.model";
import { emailService } from "./email.service";

// Temporary storage for pending signups (24 hour expiry)
interface PendingSignup {
  name: string;
  email: string;
  hashedPassword: string;
  token: string;
  expiresAt: Date;
}

const pendingSignups = new Map<string, PendingSignup>();

// Clean up expired entries every hour
setInterval(() => {
  const now = new Date();
  for (const [token, signup] of pendingSignups.entries()) {
    if (signup.expiresAt < now) {
      pendingSignups.delete(token);
    }
  }
}, 60 * 60 * 1000);

export const authService = {
  async login(email: string, password: string) {
    // Find user
    const user = await userModel.findByEmail(email);

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(isMatch);

    if (!isMatch) {
      throw new Error("Invalid email or password");
    }

    /* old code
    // Check account status
    if (user.status !== "active") {
      throw new Error("Account is banned");
    }
    */

    // Check if email is verified
    if (!user.email_verified) {
      throw new Error("Please verify your email before logging in. Check your inbox for the verification link.");
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1d",
      }
    );

    // Return response
    // ??$$$
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
      },
    };
  },

  async signup(name: string, email: string, password: string) {
    console.log('[AuthService] Starting signup for:', email);

    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);

    if (existingUser) {
      console.log('[AuthService] User already exists:', email);
      throw new Error("User already exists");
    }

    // Check if there's a pending signup for this email
    for (const signup of pendingSignups.values()) {
      if (signup.email === email) {
        console.log('[AuthService] Pending signup already exists:', email);
        throw new Error("A verification email has already been sent. Please check your inbox or wait 10 minutes to request a new one.");
      }
    }

    // Hash password
    console.log('[AuthService] Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verificationToken = uuidv4();
    console.log('[AuthService] Generated verification token:', verificationToken);

    // Store pending signup (expires in 24 hours)
    pendingSignups.set(verificationToken, {
      name,
      email,
      hashedPassword,
      token: verificationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    console.log('[AuthService] Stored pending signup. Total pending:', pendingSignups.size);

    // Send verification email
    console.log('[AuthService] Sending verification email...');
    try {
      await emailService.sendVerificationEmail(email, verificationToken, name);
      console.log('[AuthService] Verification email sent successfully!');
    } catch (err: any) {
      console.error('[AuthService] Failed to send verification email:', err.message);
      // Remove pending signup if email fails
      pendingSignups.delete(verificationToken);
      console.log('[AuthService] Removed pending signup due to email failure');
      throw new Error("Failed to send verification email. Please try again later.");
    }

    // Return response - user is NOT created yet
    return {
      message: "Please check your email and click the verification link to complete your registration.",
      email,
    };
  },

  async forgotPassword(email: string) {
    const user = await userModel.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists or not
      return {
        success: false,
        message: "If an account exists with this email, you will receive a password reset link.",
      };
    }

    // Generate reset token
    const resetToken = uuidv4();

    // Save token to user record
    await userModel.setPasswordResetToken(email, resetToken);

    // Send reset email via MailerSend API
    try {
      await emailService.sendPasswordResetEmail(email, resetToken, user.name);
      console.log('[AuthService] Password reset email sent successfully to:', email);
      return {
        success: true,
        message: "Password reset link has been sent to your email.",
      };
    } catch (err: any) {
      console.error('[AuthService] Failed to send password reset email:', err.message);
      // Return error so user knows email wasn't sent
      throw new Error('Failed to send password reset email. Please try again later.');
    }
  },

  async verifyResetToken(token: string) {
    const user = await userModel.findByPasswordResetToken(token);

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    return {
      valid: true,
      email: user.email,
    };
  },

  async resetPassword(token: string, newPassword: string) {
    const user = await userModel.findByPasswordResetToken(token);

    if (!user) {
      throw new Error("Invalid or expired reset token");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await userModel.resetPassword(token, hashedPassword);

    // Send confirmation email
    try {
      await emailService.sendPasswordChangedEmail(user.email, user.name);
    } catch (err) {
      console.error('Failed to send password changed email:', err);
    }

    return {
      message: "Password reset successfully. You can now log in with your new password.",
    };
  },

  async verifyEmail(token: string) {
    // Check pending signups first
    const pendingSignup = pendingSignups.get(token);

    if (pendingSignup) {
      // Check if expired
      if (pendingSignup.expiresAt < new Date()) {
        pendingSignups.delete(token);
        throw new Error("Verification link has expired. Please sign up again.");
      }

      // Create user now that email is verified (marked as verified immediately)
      try {
        await userModel.create(
          pendingSignup.name,
          pendingSignup.email,
          pendingSignup.hashedPassword,
          "student", // default role
          "active",  // default status
          null, // no verification token needed
          true // email is already verified
        );

        // Remove from pending
        pendingSignups.delete(token);

        // Send welcome email
        try {
          await emailService.sendWelcomeEmail(pendingSignup.email, pendingSignup.name);
        } catch (err) {
          console.error('Failed to send welcome email:', err);
        }

        return {
          message: "Email verified successfully! Your account has been created. You can now log in.",
        };
      } catch (err) {
        console.error('Failed to create user after verification:', err);
        throw new Error("Failed to create account. Please try signing up again.");
      }
    }

    // Check if this is a re-verification request for existing user
    const user = await userModel.findByEmailVerificationToken(token);

    if (!user) {
      throw new Error("Invalid or expired verification token");
    }

    // Mark email as verified
    await userModel.verifyEmail(token);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
    } catch (err) {
      console.error('Failed to send welcome email:', err);
    }

    return {
      message: "Email verified successfully! You can now log in.",
    };
  },
};