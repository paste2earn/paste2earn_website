require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcryptjs');

async function debugLogin() {
    // Check what's in DB
    const result = await pool.query(
        'SELECT id, username, email, role, status, password_hash FROM users WHERE email = $1',
        ['admin@paste2earn.com']
    );

    if (result.rows.length === 0) {
        console.log('❌ No admin user found with that email!');
        process.exit(1);
    }

    const user = result.rows[0];
    console.log('DB record:', {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        hash_preview: user.password_hash?.substring(0, 20) + '...'
    });

    // Test password match
    const match = await bcrypt.compare('admin123', user.password_hash);
    console.log('Password "admin123" matches hash:', match);

    // If not matching, reset it now
    if (!match) {
        console.log('⚠️  Hash mismatch — resetting password to admin123...');
        const newHash = await bcrypt.hash('admin123', 10);
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [newHash, 'admin@paste2earn.com']
        );
        console.log('✅ Password reset. Try logging in again with admin123.');
    } else {
        console.log('✅ Password is correct — issue might be elsewhere in auth flow.');
    }

    process.exit(0);
}

debugLogin().catch(e => { console.error(e.message); process.exit(1); });
