-- Add viewed_at column to track when question was first viewed
ALTER TABLE test_session_questions 
ADD COLUMN viewed_at TIMESTAMP NULL;

-- Create index for efficient time calculation lookups
CREATE INDEX idx_session_questions_viewed_time ON test_session_questions (session_id, question_id, viewed_at);
