-- Seed default test templates
-- Run this after creating the test_templates table to insert the 4 default templates

-- First, make sure the table exists
CREATE TABLE IF NOT EXISTS test_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50) NOT NULL,
  count INT NOT NULL DEFAULT 30,
  duration_seconds INT NOT NULL DEFAULT 1800,
  categories JSON NULL,
  question_types JSON NULL,
  subcategories JSON NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  price_paise INT NULL,
  currency VARCHAR(10) DEFAULT 'inr',
  is_active BOOLEAN DEFAULT TRUE,
  allow_reattempt BOOLEAN DEFAULT TRUE,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_test_templates_active ON test_templates (is_active, is_paid);
CREATE INDEX IF NOT EXISTS idx_test_templates_paid ON test_templates (is_paid, is_active);

-- Insert default templates (only if they don't exist and there's at least one admin user)
INSERT INTO test_templates (
  name, description, difficulty, count, duration_seconds, 
  categories, question_types, subcategories,
  is_paid, price_paise, currency, is_active, allow_reattempt, created_by
)
SELECT 
  'Easy Practice - 30 Qs',
  'Perfect for quick basic revision. Covers easy level questions across chosen streams.',
  'easy',
  30,
  1800,
  NULL,
  NULL,
  NULL,
  FALSE,
  NULL,
  'inr',
  TRUE,
  TRUE,
  id
FROM users 
WHERE role = 'admin' 
LIMIT 1
WHERE NOT EXISTS (
  SELECT 1 FROM test_templates WHERE name = 'Easy Practice - 30 Qs'
);

INSERT INTO test_templates (
  name, description, difficulty, count, duration_seconds,
  categories, question_types, subcategories,
  is_paid, price_paise, currency, is_active, allow_reattempt, created_by
)
SELECT 
  'Easy Practice - 60 Qs',
  'Full length foundation practice. Ideal for building solid speed and accuracy.',
  'easy',
  60,
  3600,
  NULL,
  NULL,
  NULL,
  FALSE,
  NULL,
  'inr',
  TRUE,
  TRUE,
  id
FROM users 
WHERE role = 'admin' 
LIMIT 1
WHERE NOT EXISTS (
  SELECT 1 FROM test_templates WHERE name = 'Easy Practice - 60 Qs'
);

INSERT INTO test_templates (
  name, description, difficulty, count, duration_seconds,
  categories, question_types, subcategories,
  is_paid, price_paise, currency, is_active, allow_reattempt, created_by
)
SELECT 
  'Hard Practice - 30 Qs',
  'Challenging intermediate and advanced tasks designed to test logical limits.',
  'hard',
  30,
  1800,
  NULL,
  NULL,
  NULL,
  FALSE,
  NULL,
  'inr',
  TRUE,
  TRUE,
  id
FROM users 
WHERE role = 'admin' 
LIMIT 1
WHERE NOT EXISTS (
  SELECT 1 FROM test_templates WHERE name = 'Hard Practice - 30 Qs'
);

INSERT INTO test_templates (
  name, description, difficulty, count, duration_seconds,
  categories, question_types, subcategories,
  is_paid, price_paise, currency, is_active, allow_reattempt, created_by
)
SELECT 
  'Hard Practice - 60 Qs',
  'Complete advanced simulation. Designed to stress test your skill stamina.',
  'hard',
  60,
  3600,
  NULL,
  NULL,
  NULL,
  TRUE,
  5000,
  'inr',
  TRUE,
  TRUE,
  id
FROM users 
WHERE role = 'admin' 
LIMIT 1
WHERE NOT EXISTS (
  SELECT 1 FROM test_templates WHERE name = 'Hard Practice - 60 Qs'
);
