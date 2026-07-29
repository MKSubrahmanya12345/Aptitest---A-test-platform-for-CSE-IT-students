-- SQL Queries for Razorpay Payment System

-- 1. Check if payments table exists and its structure
SHOW COLUMNS FROM payments;

-- 2. Add Razorpay columns if they don't exist (MySQL 8.0+)
SET @database = DATABASE();
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = @database 
AND TABLE_NAME = 'payments' 
AND COLUMN_NAME = 'razorpay_order_id';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE payments ADD COLUMN razorpay_order_id VARCHAR(255) UNIQUE NULL',
    'SELECT "Column already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add razorpay_payment_id column if not exists
SELECT COUNT(*) INTO @col_exists2 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = @database 
AND TABLE_NAME = 'payments' 
AND COLUMN_NAME = 'razorpay_payment_id';

SET @sql2 = IF(@col_exists2 = 0, 
    'ALTER TABLE payments ADD COLUMN razorpay_payment_id VARCHAR(255) UNIQUE NULL',
    'SELECT "Column already exists" AS message');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 4. Add payment_method column if not exists
SELECT COUNT(*) INTO @col_exists3 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = @database 
AND TABLE_NAME = 'payments' 
AND COLUMN_NAME = 'payment_method';

SET @sql3 = IF(@col_exists3 = 0, 
    'ALTER TABLE payments ADD COLUMN payment_method VARCHAR(20) NULL',
    'SELECT "Column already exists" AS message');
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- 5. Check current payment records
SELECT id, user_id, razorpay_order_id, razorpay_payment_id, amount_paise, test_type, status, payment_method, created_at 
FROM payments 
ORDER BY created_at DESC 
LIMIT 20;

-- 6. Check if specific user has paid for hard_60 (replace 1 with actual user_id)
SELECT * FROM payments 
WHERE user_id = 1 
AND test_type = 'hard_60' 
AND status = 'succeeded';

-- 7. Count total successful payments by test type
SELECT 
    test_type, 
    COUNT(*) as total_payments, 
    SUM(amount_paise)/100 as total_amount_rupees,
    payment_method
FROM payments 
WHERE status = 'succeeded'
GROUP BY test_type, payment_method;

-- 8. Get all payments for a specific user with user details
SELECT 
    p.id,
    p.razorpay_order_id,
    p.amount_paise / 100 as amount_rupees,
    p.test_type,
    p.status,
    p.payment_method,
    p.created_at,
    u.name as user_name,
    u.email as user_email
FROM payments p
JOIN users u ON p.user_id = u.id
WHERE p.user_id = 1
ORDER BY p.created_at DESC;

-- 9. Daily payment summary
SELECT 
    DATE(created_at) as date,
    COUNT(*) as transactions,
    SUM(CASE WHEN status = 'succeeded' THEN amount_paise ELSE 0 END) / 100 as successful_amount,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
FROM payments
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 10. Check for duplicate payments (same user + test type)
SELECT 
    user_id, 
    test_type, 
    COUNT(*) as payment_count,
    GROUP_CONCAT(id ORDER BY created_at) as payment_ids
FROM payments 
WHERE status = 'succeeded'
GROUP BY user_id, test_type
HAVING COUNT(*) > 1;
