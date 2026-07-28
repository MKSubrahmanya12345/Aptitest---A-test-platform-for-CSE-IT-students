-- Standalone seed file for test templates
-- Use this if the regular seed fails - just replace @ADMIN_USER_ID with an actual admin user ID

-- Example: Get an admin user ID first
-- SELECT id FROM users WHERE role = 'admin' LIMIT 1;
-- Then replace @ADMIN_USER_ID below with that value (e.g., 1)

SET @ADMIN_USER_ID = (SELECT id FROM users WHERE role = 'admin' LIMIT 1);

-- If no admin exists, you'll need to create one first or manually set the ID
-- Example: SET @ADMIN_USER_ID = 1;

-- Template 1: Easy Practice - 30 Questions (FREE)
INSERT IGNORE INTO test_templates (
  name, description, difficulty, count, duration_seconds, 
  categories, question_types, subcategories,
  is_paid, price_paise, currency, is_active, allow_reattempt, created_by
)
VALUES (
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
  @ADMIN_USER_ID
);

-- Template 2: Easy Practice - 60 Questions (FREE)
INSERT IGNORE INTO test_templates (
  name, description, difficulty, count, duration_seconds,
  categories, question_types, subcategories,
  is_paid, price_paise, currency, is_active, allow_reattempt, created_by
)
VALUES (
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
  @ADMIN_USER_ID
);

-- Template 3: Hard Practice - 30 Questions (FREE)
INSERT IGNORE INTO test_templates (
  name, description, difficulty, count, duration_seconds,
  categories, question_types, subcategories,
  is_paid, price_paise, currency, is_active, allow_reattempt, created_by
)
VALUES (
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
  @ADMIN_USER_ID
);

-- Template 4: Hard Practice - 60 Questions (PAID - ₹50)
INSERT IGNORE INTO test_templates (
  name, description, difficulty, count, duration_seconds,
  categories, question_types, subcategories,
  is_paid, price_paise, currency, is_active, allow_reattempt, created_by
)
VALUES (
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
  @ADMIN_USER_ID
);

SELECT 'Test templates seeded successfully!' AS message;
SELECT * FROM test_templates;
