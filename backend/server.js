require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeBot, shutdownBot } = require('./services/discordBot');
const { initializeResend } = require('./services/emailService');
const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Serve static files (for email logos)
app.use('/public', express.static('public'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Paste2Earn API running' }));

// Initialize Discord bot
initializeBot();

// Initialize Resend email service
initializeResend();

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Paste2Earn API running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n⏳ Shutting down gracefully...');
    shutdownBot();
    server.close(() => {
        console.log('✅ Server closed.');
        process.exit(0);
    });
});

// Scheduled job: return claimed tasks to pool if not submitted within 1 hour
const pool = require('./db');
setInterval(async () => {
    try {
        const result = await pool.query(`
            UPDATE tasks t
            SET status = 'active'
            FROM claimed_tasks ct
            WHERE t.id = ct.task_id 
              AND ct.status = 'claimed' 
              AND ct.created_at < NOW() - INTERVAL '1 hour'
            RETURNING ct.task_id
        `);

        if (result.rowCount > 0) {
            await pool.query(`
                DELETE FROM claimed_tasks 
                WHERE status = 'claimed' 
                  AND created_at < NOW() - INTERVAL '1 hour'
            `);
            console.log(`🕰️ Auto-expired ${result.rowCount} tasks after 1 hour.`);
        }
    } catch (err) {
        console.error('Task expiration job error:', err);
    }
}, 5 * 60 * 1000); // Check every 5 minutes
