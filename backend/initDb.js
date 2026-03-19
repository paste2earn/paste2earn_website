const pool = require('./db');

async function initDb() {
    const client = await pool.connect();
    try {
        // Check if tables already exist — if users table exists, skip init
        const tableCheck = await client.query(`
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'users'
        `);
        if (parseInt(tableCheck.rows[0].count) > 0) {
            console.log('✅ Database already initialized, skipping setup.');
            return;
        }

        console.log('🔧 First run detected — initializing database schema...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                reddit_profile_url VARCHAR(500),
                role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
                status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                tier VARCHAR(10) DEFAULT 'silver' CHECK (tier IN ('gold', 'silver')),
                wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
                discord_username VARCHAR(100),
                discord_verified BOOLEAN DEFAULT FALSE,
                discord_verify_code VARCHAR(10),
                discord_verify_expires TIMESTAMPTZ,
                approved_by INT REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                type VARCHAR(10) NOT NULL CHECK (type IN ('comment', 'post', 'reply')),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                target_url VARCHAR(500),
                comment_text TEXT,
                subreddit_url VARCHAR(500),
                post_title VARCHAR(255),
                post_body TEXT,
                reward DECIMAL(5, 2) NOT NULL,
                status VARCHAR(10) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
                created_by INT REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS claimed_tasks (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'claimed' CHECK (status IN ('claimed', 'submitted', 'approved', 'rejected', 'revision_needed', 'reported')),
                submitted_url VARCHAR(500),
                comment1 TEXT,
                comment2 TEXT,
                comment3 TEXT,
                admin_note TEXT,
                rejection_reason VARCHAR(50),
                reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
                submitted_at TIMESTAMPTZ,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(task_id)
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(10, 2) NOT NULL,
                type VARCHAR(30) DEFAULT 'earning' CHECK (type IN ('earning', 'withdrawal', 'withdrawal_pending', 'refund', 'bonus')),
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                amount DECIMAL(10, 2) NOT NULL,
                wallet_address VARCHAR(200) NOT NULL,
                wallet_type VARCHAR(20) NOT NULL CHECK (wallet_type IN ('usdt_bep20', 'usdt_polygon', 'binance_id')),
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
                admin_note TEXT,
                reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS task_reports (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
                reason VARCHAR(100) NOT NULL,
                details TEXT,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Task IDs start from 1001
        await client.query(`ALTER SEQUENCE tasks_id_seq RESTART WITH 1001;`);

        // Seed admin user (password: Paste2Earn#Admin.2026)
        await client.query(`
            INSERT INTO users (username, email, password_hash, role, status, tier)
            VALUES ('admin', 'paste2earn.owner@gmail.com', '$2a$10$iXDcRmrD/BMFyXoa2Vqj8ekG.fhz87AXI5ipYtbFPBUCFqigY3GIi', 'admin', 'approved', 'gold')
            ON CONFLICT (email) DO NOTHING
        `);

        console.log('✅ Database initialized! Admin: paste2earn.owner@gmail.com / Paste2Earn#Admin.2026');
    } catch (err) {
        console.error('❌ DB init failed:', err.message);
    } finally {
        client.release();
    }
}

module.exports = initDb;
