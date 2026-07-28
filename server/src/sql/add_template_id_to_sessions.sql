-- Migration: Add template_id to test_sessions for allow_reattempt enforcement
-- This allows tracking which template was used for a test session

-- Add template_id column
ALTER TABLE test_sessions 
ADD COLUMN template_id INT NULL AFTER user_id,
ADD FOREIGN KEY (template_id) REFERENCES test_templates(id);

-- Add index for faster lookups
CREATE INDEX idx_sessions_template ON test_sessions (template_id);
