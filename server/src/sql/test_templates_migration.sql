-- Test Templates Migration
-- Allows admin to create custom test types with configurable parameters

CREATE TABLE IF NOT EXISTS test_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50) NOT NULL,                    -- 'easy', 'basic', 'intermediate', 'advanced', 'hard'
  count INT NOT NULL DEFAULT 30,                      -- number of questions
  duration_seconds INT NOT NULL DEFAULT 1800,         -- test duration in seconds (default 30 min)
  categories JSON NULL,                               -- JSON array of category names, NULL means all
  question_types JSON NULL,                           -- JSON array of question types, NULL means all
  subcategories JSON NULL,                            -- JSON array of subcategories, NULL means all
  is_paid BOOLEAN DEFAULT FALSE,                      -- whether this test requires payment
  price_paise INT NULL,                               -- price in paise (e.g., 5000 = ₹50), required if is_paid=TRUE
  currency VARCHAR(10) DEFAULT 'inr',                 -- currency code
  is_active BOOLEAN DEFAULT TRUE,                     -- whether this template is available
  allow_reattempt BOOLEAN DEFAULT TRUE,               -- whether reattempts are allowed
  created_by INT NOT NULL,                            -- admin user who created this
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Index for fetching active templates
CREATE INDEX idx_test_templates_active ON test_templates (is_active, is_paid);

-- Index for payment lookups
CREATE INDEX idx_test_templates_paid ON test_templates (is_paid, is_active);
