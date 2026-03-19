const pool = require('./db');

/**
 * Ensures a column exists in a table.
 * If missing, it adds it with the provided definition.
 */
async function ensureColumn(client, table, column, definition) {
    const res = await client.query(`
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
    `, [table, column]);

    if (res.rows.length === 0) {
        console.log(`🚀 Migration: Adding column "${column}" to table "${table}"...`);
        await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
}

async function initDb() {
    const client = await pool.connect();
    try {
        console.log('🔧 Synchronizing database schema...');

        // 1. Create tables if they don't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                type VARCHAR(10) NOT NULL,
                title VARCHAR(255) NOT NULL,
                reward DECIMAL(5, 2) NOT NULL,
                status VARCHAR(10) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS claimed_tasks (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'claimed',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(10, 2) NOT NULL,
                type VARCHAR(30) DEFAULT 'earning',
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(10, 2) NOT NULL,
                wallet_address VARCHAR(200) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS task_reports (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
                reason VARCHAR(100) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS user_banned_subreddits (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                subreddit VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, subreddit)
            );
        `);

        // 2. Automatically sync missing columns (USERS)
        await ensureColumn(client, 'users', 'reddit_profile_url', 'VARCHAR(500)');
        await ensureColumn(client, 'users', 'role', "VARCHAR(10) DEFAULT 'user'");
        await ensureColumn(client, 'users', 'status', "VARCHAR(10) DEFAULT 'pending'");
        await ensureColumn(client, 'users', 'tier', "VARCHAR(10) DEFAULT 'silver'");
        await ensureColumn(client, 'users', 'wallet_balance', 'DECIMAL(10, 2) DEFAULT 0.00');
        await ensureColumn(client, 'users', 'discord_username', 'VARCHAR(100)');
        await ensureColumn(client, 'users', 'discord_verified', 'BOOLEAN DEFAULT FALSE');
        await ensureColumn(client, 'users', 'discord_verify_code', 'VARCHAR(10)');
        await ensureColumn(client, 'users', 'discord_verify_expires', 'TIMESTAMPTZ');
        await ensureColumn(client, 'users', 'approved_by', 'INT REFERENCES users(id) ON DELETE SET NULL');

        // 3. Automatically sync missing columns (TASKS)
        await ensureColumn(client, 'tasks', 'description', 'TEXT');
        await ensureColumn(client, 'tasks', 'target_url', 'VARCHAR(500)');
        await ensureColumn(client, 'tasks', 'comment_text', 'TEXT');
        await ensureColumn(client, 'tasks', 'subreddit_url', 'VARCHAR(500)');
        await ensureColumn(client, 'tasks', 'post_title', 'VARCHAR(255)');
        await ensureColumn(client, 'tasks', 'post_body', 'TEXT');
        await ensureColumn(client, 'tasks', 'created_by', 'INT REFERENCES users(id) ON DELETE SET NULL');

        // 4. Automatically sync missing columns (CLAIMED_TASKS)
        await ensureColumn(client, 'claimed_tasks', 'submitted_url', 'VARCHAR(500)');
        await ensureColumn(client, 'claimed_tasks', 'comment1', 'TEXT');
        await ensureColumn(client, 'claimed_tasks', 'comment2', 'TEXT');
        await ensureColumn(client, 'claimed_tasks', 'comment3', 'TEXT');
        await ensureColumn(client, 'claimed_tasks', 'admin_note', 'TEXT');
        await ensureColumn(client, 'claimed_tasks', 'rejection_reason', 'VARCHAR(50)');
        await ensureColumn(client, 'claimed_tasks', 'reviewed_by', 'INT REFERENCES users(id) ON DELETE SET NULL');
        await ensureColumn(client, 'claimed_tasks', 'submitted_at', 'TIMESTAMPTZ');

        // 5. Automatically sync missing columns (WITHDRAWAL_REQUESTS)
        await ensureColumn(client, 'withdrawal_requests', 'wallet_type', 'VARCHAR(20)');
        await ensureColumn(client, 'withdrawal_requests', 'admin_note', 'TEXT');
        await ensureColumn(client, 'withdrawal_requests', 'reviewed_by', 'INT REFERENCES users(id) ON DELETE SET NULL');
        await ensureColumn(client, 'withdrawal_requests', 'updated_at', 'TIMESTAMP DEFAULT NOW()');

        // 6. Automatically sync missing columns (TASK_REPORTS)
        await ensureColumn(client, 'task_reports', 'details', 'TEXT');
        await ensureColumn(client, 'task_reports', 'updated_at', 'TIMESTAMP DEFAULT NOW()');

        // 7. MIGRATION: Auto-update users.status CHECK constraint
        const hasBanned = await client.query(`
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'users'::regclass 
              AND conname LIKE '%status%'
              AND pg_get_constraintdef(oid) LIKE '%banned%'
        `);

        if (hasBanned.rows.length === 0) {
            console.log('🚀 Migration: Updating status constraint to include "banned"...');
            const constraintRes = await client.query(`SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname LIKE '%status%'`);
            for (let row of constraintRes.rows) {
                await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS "${row.conname}"`);
            }
            await client.query(`ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'banned'))`);
        }

        // 8. MIGRATION: Auto-enforce UNIQUE(task_id) for claimed_tasks
        const uniqueCheck = await client.query(`
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'claimed_tasks' AND indexdef LIKE '%UNIQUE%task_id%'
        `);
        
        if (uniqueCheck.rows.length === 0) {
            console.log('🚀 Migration: Enforcing 1 user per task for claimed_tasks...');
            await client.query(`
                DELETE FROM claimed_tasks ct WHERE ct.id NOT IN (
                    SELECT DISTINCT ON (task_id) id FROM claimed_tasks ORDER BY task_id, created_at DESC
                )
            `);
            await client.query(`ALTER TABLE claimed_tasks DROP CONSTRAINT IF EXISTS claimed_tasks_user_id_task_id_key`);
            await client.query(`ALTER TABLE claimed_tasks ADD CONSTRAINT claimed_tasks_task_id_unique UNIQUE(task_id)`);
        }

        // 9. Ensure task ID sequence starts at 1001 for new setups
        const seqRes = await client.query("SELECT last_value, is_called FROM tasks_id_seq");
        if (seqRes.rows[0].last_value == 1 && !seqRes.rows[0].is_called) {
            await client.query(`ALTER SEQUENCE tasks_id_seq RESTART WITH 1001;`);
            console.log('   ✓ Set tasks ID sequence to start from 1001');
        }

        // 10. Seed default admin if missing
        await client.query(`
            INSERT INTO users (username, email, password_hash, role, status, tier)
            VALUES ('admin', 'paste2earn.owner@gmail.com', '$2a$10$iXDcRmrD/BMFyXoa2Vqj8ekG.fhz87AXI5ipYtbFPBUCFqigY3GIi', 'admin', 'approved', 'gold')
            ON CONFLICT (email) DO NOTHING
        `);

        console.log('✅ Database schema is fully synchronized.');
    } catch (err) {
        console.error('❌ DB Schema Sync failed:', err.message);
    } finally {
        client.release();
    }
}

module.exports = initDb;
