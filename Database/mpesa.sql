-- ============================================
-- M-PESA TRANSACTIONS TABLE (PostgreSQL Optimized)
-- ============================================

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS mpesa_transactions CASCADE;

-- Create table with SERIAL ID
CREATE TABLE mpesa_transactions (
    transaction_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    checkout_request_id VARCHAR(100) UNIQUE NOT NULL,
    merchant_request_id VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    mpesa_receipt_number VARCHAR(50),
    transaction_date BIGINT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    result_code VARCHAR(10),
    result_desc TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for optimal query performance
CREATE INDEX idx_mpesa_checkout_request ON mpesa_transactions(checkout_request_id);
CREATE INDEX idx_mpesa_order_id ON mpesa_transactions(order_id);
CREATE INDEX idx_mpesa_status ON mpesa_transactions(status);
CREATE INDEX idx_mpesa_created_at ON mpesa_transactions(created_at DESC);
CREATE INDEX idx_mpesa_phone ON mpesa_transactions(phone_number);
CREATE INDEX idx_mpesa_status_created ON mpesa_transactions(status, created_at DESC);

-- Add table comments
COMMENT ON TABLE mpesa_transactions IS 'M-Pesa STK Push transaction tracking';
COMMENT ON COLUMN mpesa_transactions.transaction_id IS 'Auto-incrementing primary key';
COMMENT ON COLUMN mpesa_transactions.order_id IS 'Foreign key reference to orders table';
COMMENT ON COLUMN mpesa_transactions.checkout_request_id IS 'Unique identifier from M-Pesa STK Push request';
COMMENT ON COLUMN mpesa_transactions.mpesa_receipt_number IS 'M-Pesa confirmation code (e.g., QGR9ABCDEF)';
COMMENT ON COLUMN mpesa_transactions.transaction_date IS 'M-Pesa timestamp in format: YYYYMMDDHHmmss';
COMMENT ON COLUMN mpesa_transactions.status IS 'Transaction status: pending, completed, failed, cancelled';


-- ============================================
-- OPTIMIZED QUERIES FOR MONITORING
-- ============================================

-- 1. Check recent M-Pesa transactions with order details
SELECT 
    t.transaction_id,
    t.checkout_request_id,
    t.phone_number,
    t.amount,
    t.status,
    t.mpesa_receipt_number,
    t.result_code,
    t.result_desc,
    o.order_id,
    o.status AS order_status,
    o.total_amount,
    t.created_at
FROM mpesa_transactions t
INNER JOIN orders o ON t.order_id = o.order_id
ORDER BY t.created_at DESC
LIMIT 20;

-- 2. Get pending M-Pesa payments (last hour)
SELECT 
    t.transaction_id,
    t.order_id,
    t.checkout_request_id,
    t.phone_number,
    t.amount,
    o.user_id,
    o.total_amount,
    EXTRACT(EPOCH FROM (NOW() - t.created_at)) AS seconds_pending
FROM mpesa_transactions t
INNER JOIN orders o ON t.order_id = o.order_id
WHERE t.status = 'pending'
AND t.created_at > NOW() - INTERVAL '1 hour'
ORDER BY t.created_at DESC;

-- 3. M-Pesa payment success rate (last 7 days)
SELECT 
    status,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS percentage,
    ROUND(AVG(amount)::numeric, 2) AS avg_amount
FROM mpesa_transactions
WHERE created_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY status
ORDER BY count DESC;

-- 4. Failed payments analysis (last 30 days)
SELECT 
    result_code,
    result_desc,
    COUNT(*) AS occurrences,
    ROUND(AVG(amount)::numeric, 2) AS avg_amount,
    MAX(created_at) AS last_occurrence
FROM mpesa_transactions
WHERE status = 'failed'
AND created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY result_code, result_desc
ORDER BY occurrences DESC;

-- 5. Daily M-Pesa revenue (last 30 days)
SELECT 
    DATE(t.created_at) AS transaction_date,
    COUNT(*) AS transaction_count,
    SUM(t.amount) AS total_revenue,
    ROUND(AVG(t.amount)::numeric, 2) AS avg_transaction,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed_count,
    COUNT(CASE WHEN t.status = 'failed' THEN 1 END) AS failed_count
FROM mpesa_transactions t
WHERE t.created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(t.created_at)
ORDER BY transaction_date DESC;

-- 6. Hourly transaction volume (for traffic analysis)
SELECT 
    DATE_TRUNC('hour', t.created_at) AS hour,
    COUNT(*) AS total_transactions,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS successful,
    COUNT(CASE WHEN t.status = 'failed' THEN 1 END) AS failed,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) AS pending,
    SUM(t.amount) AS total_amount
FROM mpesa_transactions t
WHERE t.created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', t.created_at)
ORDER BY hour DESC;

-- 7. Top phone numbers by transaction count
SELECT 
    t.phone_number,
    COUNT(*) AS transaction_count,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS successful,
    SUM(t.amount) FILTER (WHERE t.status = 'completed') AS total_spent,
    MAX(t.created_at) AS last_transaction
FROM mpesa_transactions t
WHERE t.created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY t.phone_number
HAVING COUNT(*) > 1
ORDER BY transaction_count DESC
LIMIT 20;

-- 8. Outstanding/Timeout transactions (pending > 10 minutes)
SELECT 
    t.transaction_id,
    t.order_id,
    t.checkout_request_id,
    t.phone_number,
    t.amount,
    EXTRACT(EPOCH FROM (NOW() - t.created_at))::INTEGER AS seconds_waiting,
    o.user_id
FROM mpesa_transactions t
INNER JOIN orders o ON t.order_id = o.order_id
WHERE t.status = 'pending'
AND t.created_at < NOW() - INTERVAL '10 minutes'
ORDER BY t.created_at ASC;

-- 9. Transaction reconciliation (completed transactions without order status update)
SELECT 
    t.transaction_id,
    t.order_id,
    t.mpesa_receipt_number,
    t.amount,
    t.created_at,
    o.status AS order_status,
    CASE 
        WHEN o.status != 'processing' THEN 'NEEDS_UPDATE'
        ELSE 'OK'
    END AS reconciliation_status
FROM mpesa_transactions t
INNER JOIN orders o ON t.order_id = o.order_id
WHERE t.status = 'completed'
AND t.created_at > CURRENT_DATE - INTERVAL '1 day'
AND o.status NOT IN ('processing', 'shipped', 'delivered')
ORDER BY t.created_at DESC;

-- 10. Payment method statistics
SELECT 
    'M-Pesa' AS payment_method,
    COUNT(*) AS total_transactions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS successful,
    ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / COUNT(*)) * 100, 2) AS success_rate,
    ROUND(SUM(amount)::numeric, 2) AS total_amount,
    ROUND(AVG(amount)::numeric, 2) AS avg_transaction
FROM mpesa_transactions
WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT 
    'All Methods',
    COUNT(*),
    COUNT(CASE WHEN p.is_confirmed THEN 1 END),
    ROUND((COUNT(CASE WHEN p.is_confirmed THEN 1 END)::numeric / COUNT(*)) * 100, 2),
    ROUND(SUM(p.amount)::numeric, 2),
    ROUND(AVG(p.amount)::numeric, 2)
FROM payments p
WHERE p.created_at > CURRENT_DATE - INTERVAL '30 days';


-- ============================================
-- MAINTENANCE QUERIES
-- ============================================

-- 1. Archive old transactions to improve performance (move to archive table)
CREATE TABLE IF NOT EXISTS mpesa_transactions_archive AS
SELECT * FROM mpesa_transactions WHERE created_at < CURRENT_DATE - INTERVAL '90 days' LIMIT 0;

-- Archive transactions older than 90 days
INSERT INTO mpesa_transactions_archive
SELECT * FROM mpesa_transactions 
WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
AND status IN ('completed', 'failed', 'cancelled');

-- Delete archived transactions from main table
DELETE FROM mpesa_transactions 
WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
AND status IN ('completed', 'failed', 'cancelled');

-- 2. Update transaction timestamps for created_at/updated_at
UPDATE mpesa_transactions 
SET updated_at = CURRENT_TIMESTAMP 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '30 minutes';

-- 3. Mark stale pending transactions as failed (older than 30 minutes)
UPDATE mpesa_transactions 
SET status = 'failed', 
    result_code = 'TIMEOUT',
    result_desc = 'Transaction timeout - no response from M-Pesa',
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '30 minutes';

-- 4. Verify referential integrity
SELECT 
    t.transaction_id,
    t.order_id,
    COUNT(*) as count
FROM mpesa_transactions t
LEFT JOIN orders o ON t.order_id = o.order_id
WHERE o.order_id IS NULL
GROUP BY t.transaction_id, t.order_id;

-- 5. Vacuum and analyze for performance
VACUUM ANALYZE mpesa_transactions;
REINDEX TABLE mpesa_transactions;


-- ============================================
-- TRANSACTION PROCESSING FUNCTIONS
-- ============================================

-- Function to get transaction status with details
CREATE OR REPLACE FUNCTION get_transaction_details(p_transaction_id INTEGER)
RETURNS TABLE(
    transaction_id INTEGER,
    order_id INTEGER,
    phone_number VARCHAR,
    amount NUMERIC,
    status VARCHAR,
    mpesa_receipt_number VARCHAR,
    result_code VARCHAR,
    result_desc TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    time_pending INTERVAL
) AS $$
SELECT 
    t.transaction_id,
    t.order_id,
    t.phone_number,
    t.amount,
    t.status,
    t.mpesa_receipt_number,
    t.result_code,
    t.result_desc,
    t.created_at,
    NOW() - t.created_at AS time_pending
FROM mpesa_transactions t
WHERE t.transaction_id = p_transaction_id;
$$ LANGUAGE SQL STABLE;

-- Function to update transaction status
CREATE OR REPLACE FUNCTION update_transaction_status(
    p_checkout_request_id VARCHAR,
    p_status VARCHAR,
    p_mpesa_receipt VARCHAR DEFAULT NULL,
    p_result_code VARCHAR DEFAULT NULL,
    p_result_desc TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message VARCHAR,
    transaction_id INTEGER
) AS $$
DECLARE
    v_transaction_id INTEGER;
BEGIN
    UPDATE mpesa_transactions 
    SET 
        status = p_status,
        mpesa_receipt_number = COALESCE(p_mpesa_receipt, mpesa_receipt_number),
        result_code = COALESCE(p_result_code, result_code),
        result_desc = COALESCE(p_result_desc, result_desc),
        updated_at = CURRENT_TIMESTAMP
    WHERE checkout_request_id = p_checkout_request_id
    RETURNING transaction_id INTO v_transaction_id;
    
    IF v_transaction_id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE::BOOLEAN,
            'Transaction not found'::VARCHAR,
            NULL::INTEGER;
    ELSE
        RETURN QUERY SELECT 
            TRUE::BOOLEAN,
            'Transaction updated successfully'::VARCHAR,
            v_transaction_id::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending transactions count
CREATE OR REPLACE FUNCTION count_pending_transactions()
RETURNS TABLE(
    pending_count INTEGER,
    total_pending_amount NUMERIC,
    oldest_pending_age INTERVAL
) AS $$
SELECT 
    COUNT(*)::INTEGER,
    SUM(amount),
    NOW() - MIN(created_at)
FROM mpesa_transactions
WHERE status = 'pending';
$$ LANGUAGE SQL STABLE;


-- ============================================
-- ALERTS AND MONITORING SETUP
-- ============================================

-- Alert 1: High failure rate
SELECT 
    CASE 
        WHEN (COUNT(CASE WHEN status = 'failed' THEN 1 END)::NUMERIC / COUNT(*)) > 0.1
        THEN 'ALERT: High M-Pesa failure rate (>10%) in last hour'
        ELSE 'OK'
    END AS failure_rate_alert
FROM mpesa_transactions
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Alert 2: Many pending transactions
SELECT 
    CASE 
        WHEN COUNT(*) > 50
        THEN 'ALERT: ' || COUNT(*) || ' pending transactions older than 5 minutes'
        ELSE 'OK'
    END AS pending_alert
FROM mpesa_transactions
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '5 minutes';

-- Alert 3: Large transaction amount unusual
SELECT 
    CASE 
        WHEN MAX(amount) > (SELECT AVG(amount) * 3 FROM mpesa_transactions WHERE created_at > NOW() - INTERVAL '7 days')
        THEN 'ALERT: Unusually large transaction detected'
        ELSE 'OK'
    END AS unusual_amount_alert
FROM mpesa_transactions
WHERE created_at > NOW() - INTERVAL '1 hour';