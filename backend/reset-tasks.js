/**
 * Paste2Earn — Reset Tasks Only
 * Clears tasks, claimed_tasks, and task_reports, then resets the ID
 * sequence back to 1000 (so next task is #1001).
 * Users, wallets, transactions, and withdrawals are untouched.
 *
 * Usage (from the backend/ folder):
 *   node reset-tasks.js
 */

require('dotenv').config();
const pool = require('./db');

async function resetTasks() {
    const client = await pool.connect();
    try {
        console.log('🗑️  Resetting tasks data...\n');

        await client.query('BEGIN');

        // 1. Remove all task reports (FK → tasks)
        const rep = await client.query('DELETE FROM task_reports RETURNING id');
        console.log(`   ✓ Deleted ${rep.rowCount} task report(s)`);

        // 2. Remove all claimed tasks (FK → tasks)
        const ct = await client.query('DELETE FROM claimed_tasks RETURNING id');
        console.log(`   ✓ Deleted ${ct.rowCount} claimed task(s)`);

        // 3. Remove all tasks
        const t = await client.query('DELETE FROM tasks RETURNING id');
        console.log(`   ✓ Deleted ${t.rowCount} task(s)`);

        // 4. Reset the sequence so the next task gets ID #1001
        await client.query(`ALTER SEQUENCE tasks_id_seq RESTART WITH 1001;`);
        console.log('   ✓ Sequence reset — next task will be #1001');

        await client.query('COMMIT');
        console.log('\n✅ Tasks reset complete! Users & wallets are untouched.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Reset failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

resetTasks();
