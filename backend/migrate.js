require('dotenv').config();
const pool = require('./db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Add revision_needed to claimed_tasks status and expand column max length
        await client.query('ALTER TABLE claimed_tasks ALTER COLUMN status TYPE VARCHAR(20)');
        await client.query('ALTER TABLE claimed_tasks DROP CONSTRAINT IF EXISTS claimed_tasks_status_check');
        await client.query(
            `ALTER TABLE claimed_tasks ADD CONSTRAINT claimed_tasks_status_check
             CHECK (status IN ('claimed','submitted','approved','rejected','revision_needed','reported'))`
        );

        // Add reply to tasks type
        await client.query('ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_type_check');
        await client.query(
            `ALTER TABLE tasks ADD CONSTRAINT tasks_type_check
             CHECK (type IN ('comment', 'post', 'reply'))`
        );

        // Add rejection_reason column if not exists
        await client.query(
            `ALTER TABLE claimed_tasks ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(50)`
        );

        // Create task_reports table
        await client.query(`
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

        await client.query('COMMIT');
        console.log('✅ revision_needed status + rejection_reason column added.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
