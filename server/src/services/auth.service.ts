import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';

import { userModel } from "../models/user.model";
import { emailService } from "./email.service";

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
    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verificationToken = uuidv4();

    // Create user with unverified email
    const newUser = await userModel.create(
      name,
      email,
      hashedPassword,
      "student", // default role
      "active",  // default status
      verificationToken
    );

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, verificationToken, name);
    } catch (err) {
      console.error('Failed to send verification email:', err);
      // Don't throw here - user is created, they can resend verification
    }

    // Return response without token - user needs to verify email first
    return {
      message: "Account created successfully. Please check your email to verify your account.",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        email_verified: false,
      },
    };
  },

  async forgotPassword(email: string) {
    const user = await userModel.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists or not
      return {
        message: "If an account exists with this email, you will receive a password reset link.",
      };
    }

    // Generate reset token
    const resetToken = uuidv4();

    // Save token to user record
    await userModel.setPasswordResetToken(email, resetToken);

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(email, resetToken, user.name);
    } catch (err: any) {
      console.error('Failed to send password reset email:', err);
      // Still return success message but log the actual error
      // This prevents 500 errors when email service fails
    }

    return {
      message: "If an account exists with this email, you will receive a password reset link.",
    };
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

  async resendVerificationEmail(email: string) {
    const user = await userModel.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      return {
        message: "If an account exists with this email, a verification link has been sent.",
      };
    }

    if (user.email_verified) {
      throw new Error("Email is already verified");
    }

    // Generate new verification token
    const verificationToken = uuidv4();
    await userModel.setEmailVerificationToken(email, verificationToken);

    // Resend verification email
    try {
      await emailService.sendVerificationEmail(email, verificationToken, user.name);
    } catch (err) {
      console.error('Failed to resend verification email:', err);
      throw new Error('Failed to send verification email. Please try again later.');
    }

    return {
      message: "If an account exists with this email, a verification link has been sent.",
    };
  },
};