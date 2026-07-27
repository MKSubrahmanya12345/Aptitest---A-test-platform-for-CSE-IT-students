-- ??$$$
-- Payments table for Hard 60 premium test access
-- idempotency_key (UUID) prevents duplicate charges for same user+test
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  idempotency_key VARCHAR(191) UNIQUE NOT NULL,   -- UUID generated on client, prevents double-charge
  stripe_payment_intent_id VARCHAR(255) UNIQUE NULL,
  amount_paise INT NOT NULL DEFAULT 5000,          -- 50 INR = 5000 paise
  currency VARCHAR(10) NOT NULL DEFAULT 'inr',
  test_type VARCHAR(50) NOT NULL,                 -- e.g. 'hard_60'
  status ENUM('pending', 'succeeded', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_user_test ON payments (user_id, test_type, status);
