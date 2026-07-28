-- Migration: Fix foreign key to allow template deletion with SET NULL
-- This allows deleting templates while keeping test_sessions with NULL template_id

-- Drop existing foreign key constraint
ALTER TABLE test_sessions DROP FOREIGN KEY test_sessions_ibfk_2;

-- Re-add with ON DELETE SET NULL
ALTER TABLE test_sessions 
ADD FOREIGN KEY (template_id) REFERENCES test_templates(id) ON DELETE SET NULL;
