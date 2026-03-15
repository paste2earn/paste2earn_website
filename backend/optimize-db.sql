-- Database Optimization: Add Indexes for Better Performance
-- Run this after your database is set up and has some data

-- Tasks indexes (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Claimed tasks indexes (heavily used in joins)
CREATE INDEX IF NOT EXISTS idx_claimed_tasks_status ON claimed_tasks(status);
CREATE INDEX IF NOT EXISTS idx_claimed_tasks_user_id ON claimed_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_claimed_tasks_task_id ON claimed_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_claimed_tasks_created_at ON claimed_tasks(created_at DESC);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Task reports indexes
CREATE INDEX IF NOT EXISTS idx_task_reports_status ON task_reports(status);
CREATE INDEX IF NOT EXISTS idx_task_reports_user_id ON task_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_task_reports_task_id ON task_reports(task_id);

-- Withdrawal requests indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_claimed_tasks_user_status ON claimed_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, created_at DESC);

VACUUM ANALYZE;

-- Verify indexes were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
