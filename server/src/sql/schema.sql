-- ??$$$
-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(191) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'student') DEFAULT 'student',
  status ENUM('active', 'banned') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  difficulty ENUM('basic', 'intermediate', 'advanced'),
  question_type VARCHAR(50) NOT NULL,
  question_text TEXT NOT NULL,
  passage TEXT NULL,
  data_block JSON NULL,
  options JSON NULL,
  correct_answer JSON NOT NULL,
  grading_config JSON NOT NULL,
  solution TEXT NULL,
  source_file VARCHAR(255),
  source_question_no INT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create review_pending_questions table
CREATE TABLE IF NOT EXISTS review_pending_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  difficulty VARCHAR(50),
  detected_question_type VARCHAR(50),
  final_question_type VARCHAR(50) NULL,
  question_text TEXT NOT NULL,
  passage TEXT NULL,
  data_block JSON NULL,
  options JSON NULL,
  correct_answer JSON NULL,
  grading_config JSON NULL,
  solution TEXT NULL,
  source_file VARCHAR(255),
  source_question_no INT,
  parser_confidence DECIMAL(5,2) DEFAULT 0,
  warnings JSON NULL,
  status ENUM('pending', 'approved', 'rejected', 'needs_edit') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ??$$$
-- One row per test attempt (fresh or reattempt)
CREATE TABLE IF NOT EXISTS test_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  difficulty VARCHAR(50),
  total_questions INT NOT NULL,
  duration_seconds INT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  server_expires_at TIMESTAMP NOT NULL,        -- started_at + duration_seconds, set by server
  submitted_at TIMESTAMP NULL,
  status ENUM('in_progress','completed','abandoned') DEFAULT 'in_progress',
  is_reattempt BOOLEAN DEFAULT FALSE,
  original_session_id INT NULL,                -- FK to test_sessions.id if reattempt
  counts_for_stats BOOLEAN DEFAULT TRUE,        -- FALSE for reattempts
  score DECIMAL(6,2) NULL,
  total_marks DECIMAL(6,2) NULL,
  correct_count INT NULL,
  wrong_count INT NULL,
  skipped_count INT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (original_session_id) REFERENCES test_sessions(id)
);

-- Snapshot of questions served for this session (order + which questions, immutable)
/* old code
CREATE TABLE IF NOT EXISTS test_session_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  question_id INT NOT NULL,
  question_order INT NOT NULL,
  marks DECIMAL(5,2) DEFAULT 1,
  FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);
*/
-- ??$$$
CREATE TABLE IF NOT EXISTS test_session_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  question_id INT NOT NULL,
  question_order INT NOT NULL,
  marks DECIMAL(5,2) DEFAULT 1,
  is_viewed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- User's answers per question per session
/* old code
CREATE TABLE IF NOT EXISTS test_session_answers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL,
  question_id INT NOT NULL,
  user_answer JSON NULL,
  is_correct BOOLEAN NULL,
  marks_awarded DECIMAL(5,2) DEFAULT 0,
  time_taken_seconds INT NULL,
  answered_at TIMESTAMP NULL,
  UNIQUE KEY unique_session_question (session_id, question_id),
  FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);
*/
-- ??$$$
CREATE TABLE IF NOT EXISTS test_session_answers (
  session_id INT NOT NULL,
  question_id INT NOT NULL,
  user_answer JSON NULL,
  is_correct BOOLEAN NULL,
  marks_awarded DECIMAL(5,2) DEFAULT 0,
  time_taken_seconds INT NULL,
  answered_at TIMESTAMP NULL,
  PRIMARY KEY (session_id, question_id),
  FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- ??$$$
-- High Concurrency Performance Indexes
CREATE INDEX idx_sessions_user_status ON test_sessions (user_id, status);
CREATE INDEX idx_sessions_expires_status ON test_sessions (status, server_expires_at);
CREATE INDEX idx_sessions_submitted ON test_sessions (submitted_at);
CREATE INDEX idx_session_questions_viewed ON test_session_questions (session_id, is_viewed, question_id);
CREATE INDEX idx_answers_session_question ON test_session_answers (session_id, question_id);



