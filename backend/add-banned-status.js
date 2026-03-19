const pool = require('./db');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('🔍 Altering users.status CHECK constraint...');
        
        // Find existing constraint name
        const findRes = await client.query(`
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'users'::regclass AND conname LIKE '%status%'
        `);
        
        if (findRes.rows.length > 0) {
            for (let row of findRes.rows) {
                console.log(`🗑️ Dropping old constraint: ${row.conname}`);
                await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS "${row.conname}"`);
            }
        }
        
        console.log('✨ Adding updated status constraint (pending, approved, rejected, banned)...');
        await client.query(`ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'banned'))`);
        
        await client.query('COMMIT');
        console.log('🚀 Migration successful: "banned" status added to users.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
