// Run this once to reset the admin password: node seed-admin.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seedAdmin() {
    const hash = await bcrypt.hash('admin123', 10);
    console.log('Generated hash:', hash);

    await pool.query(`
    INSERT INTO users (username, email, password_hash, role, status)
    VALUES ('admin', 'admin@paste2earn.com', $1, 'admin', 'approved')
    ON CONFLICT (email) DO UPDATE SET password_hash = $1, role = 'admin', status = 'approved'
  `, [hash]);

    console.log('✅ Admin user upserted successfully.');
    console.log('   Email:    admin@paste2earn.com');
    console.log('   Password: admin123');
    process.exit(0);
}

seedAdmin().catch(err => { console.error('Error:', err.message); process.exit(1); });
