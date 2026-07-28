-- ============================================
-- RUN THESE COMMANDS TO FIX "No Test Templates" BUG
-- ============================================
-- 
-- Step 1: First, make sure the test_templates table exists
-- (Skip this if you already ran the migrations)

-- Step 2: Get your admin user ID (or create one first)
-- Run this to find your admin user ID:
-- SELECT id, name, email, role FROM users WHERE role = 'admin';

-- Step 3: Replace ADMIN_ID below with your actual admin user ID
-- Then run these INSERT statements:

SET FOREIGN_KEY_CHECKS=0;

-- Template 1: Easy Practice - 30 Questions (FREE)
INSERT IGNORE INTO test_templates (
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
FROM users WHERE role = 'admin' LIMIT 1;

-- Template 2: Easy Practice - 60 Questions (FREE)
INSERT IGNORE INTO test_templates (
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
FROM users WHERE role = 'admin' LIMIT 1;

-- Template 3: Hard Practice - 30 Questions (FREE)
INSERT IGNORE INTO test_templates (
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
FROM users WHERE role = 'admin' LIMIT 1;

-- Template 4: Hard Practice - 60 Questions (PAID - ₹50)
INSERT IGNORE INTO test_templates (
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
FROM users WHERE role = 'admin' LIMIT 1;

SET FOREIGN_KEY_CHECKS=1;

-- Verify the templates were created:
SELECT id, name, difficulty, count, duration_seconds/60 as duration_min, is_paid, price_paise/100 as price_rupees 
FROM test_templates;
