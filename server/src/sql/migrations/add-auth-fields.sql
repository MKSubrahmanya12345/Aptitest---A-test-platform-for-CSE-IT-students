-- Migration: Add authentication and verification fields to users table
-- Run this if you get "Unknown column" errors for password_reset_token or email_verification_token

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP NULL;
