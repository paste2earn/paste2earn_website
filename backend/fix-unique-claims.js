const pool = require('./db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('🔍 Identifying duplicate claims...');
        // Delete all but the newest claim for each task_id
        const deleteRes = await client.query(`
            DELETE FROM claimed_tasks ct
            WHERE ct.id NOT IN (
                SELECT DISTINCT ON (task_id) id
                FROM claimed_tasks
                ORDER BY task_id, created_at DESC
            )
        `);
        console.log(`✅ Cleaned up ${deleteRes.rowCount} duplicate claim(s).`);

        console.log('🔧 Adding UNIQUE constraint on task_id...');
        // Drop old unique(user_id, task_id) if exists - it is usually named 'claimed_tasks_user_id_task_id_key'
        await client.query(`ALTER TABLE claimed_tasks DROP CONSTRAINT IF EXISTS claimed_tasks_user_id_task_id_key`);
        
        // Add new UNIQUE constraint
        await client.query(`ALTER TABLE claimed_tasks ADD CONSTRAINT claimed_tasks_task_id_unique UNIQUE(task_id)`);
        
        await client.query('COMMIT');
        console.log('🚀 Migration successful: claimed_tasks now enforced to 1 user per task.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
