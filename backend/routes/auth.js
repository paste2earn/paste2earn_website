const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Helper: generate a random 6-char uppercase alphanumeric code
function generateVerifyCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password, reddit_profile_url, discord_username } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    if (!reddit_profile_url) {
        return res.status(400).json({ message: 'Reddit profile URL is required.' });
    }
    if (!discord_username) {
        return res.status(400).json({ message: 'Discord username is required.' });
    }
    // Strip leading @ if present
    const cleanDiscord = discord_username.trim().replace(/^@/, '').toLowerCase();

    try {
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2 OR reddit_profile_url = $3',
            [email, username, reddit_profile_url]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Email, username, or Reddit profile already linked to another account.' });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const verifyCode = generateVerifyCode();

        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, reddit_profile_url, discord_username,
              discord_verify_code, discord_verify_expires, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '15 minutes', 'user', 'pending')
       RETURNING id, username, email, role, status, reddit_profile_url, wallet_balance, tier,
                 discord_username, discord_verified, discord_verify_code, discord_verify_expires`,
            [username, email, password_hash, reddit_profile_url, cleanDiscord, verifyCode]
        );

        const newUser = result.rows[0];
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, role: newUser.role, status: newUser.status, tier: newUser.tier },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Registration successful. Admin will verify your Reddit profile and assign a tier.',
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                status: newUser.status,
                tier: newUser.tier,
                reddit_profile_url: newUser.reddit_profile_url,
                wallet_balance: newUser.wallet_balance,
                discord_username: newUser.discord_username,
                discord_verified: newUser.discord_verified,
                discord_verify_code: newUser.discord_verify_code,
                discord_verify_expires: newUser.discord_verify_expires
            }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        if (user.status === 'rejected') {
            return res.status(403).json({ message: 'Your account has been rejected.' });
        }
        if (user.status === 'banned') {
            return res.status(403).json({ message: 'Your account has been blocked/banned.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, status: user.status, tier: user.tier },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status,
                tier: user.tier,
                reddit_profile_url: user.reddit_profile_url,
                wallet_balance: user.wallet_balance
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET /api/auth/discord/status - get current Discord verification status
router.get('/discord/status', require('../middleware/auth'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT discord_username, discord_verified, discord_verify_code, discord_verify_expires
             FROM users WHERE id = $1`,
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
        const u = result.rows[0];
        // Extract bot ID from the token (first part is base64 encoded user ID)
        let bot_id = null;
        if (process.env.DISCORD_BOT_TOKEN) {
            try {
                const parts = process.env.DISCORD_BOT_TOKEN.split('.');
                if (parts.length > 0) {
                    bot_id = Buffer.from(parts[0], 'base64').toString('utf8');
                }
            } catch (e) { /* silent */ }
        }

        res.json({
            discord_username: u.discord_username,
            discord_verified: u.discord_verified,
            discord_verify_code: u.discord_verify_code,
            code_expired: u.discord_verify_expires ? new Date(u.discord_verify_expires) < new Date() : true,
            discord_verify_expires: u.discord_verify_expires,
            bot_id: bot_id
        });
    } catch (err) {
        console.error('Discord status error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/auth/discord/resend - regenerate a new verify code (rate-limited: 2 min)
router.post('/discord/resend', require('../middleware/auth'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT discord_verified, discord_verify_expires FROM users WHERE id = $1`,
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
        const u = result.rows[0];

        if (u.discord_verified) {
            return res.status(400).json({ message: 'Discord is already verified.' });
        }

        // Rate limit: if existing code still has more than 13 min left, too soon
        if (u.discord_verify_expires) {
            const remaining = new Date(u.discord_verify_expires) - new Date();
            if (remaining > 13 * 60 * 1000) {
                const waitSec = Math.ceil((remaining - 13 * 60 * 1000) / 1000);
                return res.status(429).json({
                    message: `Please wait ${waitSec}s before requesting a new code.`
                });
            }
        }

        const newCode = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);

        const upRes = await pool.query(
            `UPDATE users SET discord_verify_code = $1, discord_verify_expires = NOW() + INTERVAL '15 minutes', updated_at = NOW() 
             WHERE id = $2 RETURNING discord_verify_expires`,
            [newCode, req.user.id]
        );

        res.json({
            message: 'New verification code generated.',
            discord_verify_code: newCode,
            discord_verify_expires: upRes.rows[0].discord_verify_expires
        });
    } catch (err) {
        console.error('Discord resend error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// PATCH /api/auth/password - change password (requires auth)
router.patch('/password', require('../middleware/auth'), async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        return res.status(400).json({ message: 'Current password and new password are required.' });
    }
    if (new_password.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }

    try {
        const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });

        const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
        if (!valid) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        const password_hash = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, req.user.id]);

        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, role, status, tier, reddit_profile_url, wallet_balance, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET /api/auth/me/banned-subreddits
router.get('/me/banned-subreddits', require('../middleware/auth'), async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT subreddit FROM user_banned_subreddits WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(result.rows.map(r => r.subreddit));
    } catch (err) {
        console.error('Get banned subreddits error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/auth/me/banned-subreddits
router.post('/me/banned-subreddits', require('../middleware/auth'), async (req, res) => {
    const { subreddit } = req.body;
    if (!subreddit || typeof subreddit !== 'string') {
        return res.status(400).json({ message: 'Subreddit name is required.' });
    }

    // Clean up "r/example" -> "example"
    let cleanSubreddit = subreddit.trim().toLowerCase();
    if (cleanSubreddit.startsWith('r/')) {
        cleanSubreddit = cleanSubreddit.slice(2);
    }
    
    // remove leading/trailing slashes
    cleanSubreddit = cleanSubreddit.replace(/^\/+|\/+$/g, '');

    try {
        await pool.query(
            'INSERT INTO user_banned_subreddits (user_id, subreddit) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.user.id, cleanSubreddit]
        );

        // Fetch user's claimed tasks to check if we need to release any
        const claimedRes = await pool.query(`
            SELECT ct.task_id, t.target_url, t.subreddit_url, t.type 
            FROM claimed_tasks ct
            JOIN tasks t ON t.id = ct.task_id
            WHERE ct.user_id = $1 AND ct.status = 'claimed'
        `, [req.user.id]);

        const taskIdsToRelease = [];
        claimedRes.rows.forEach(t => {
            const url = t.type === 'post' ? t.subreddit_url : t.target_url;
            if (!url) return;
            try {
                const match = new URL(url).pathname.match(/\/r\/([^\/]+)/i);
                if (match && match[1].toLowerCase() === cleanSubreddit) {
                    taskIdsToRelease.push(t.task_id);
                }
            } catch { }
        });

        if (taskIdsToRelease.length > 0) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                await client.query(`UPDATE tasks SET status = 'active' WHERE id = ANY($1::int[])`, [taskIdsToRelease]);
                await client.query(`DELETE FROM claimed_tasks WHERE task_id = ANY($1::int[]) AND user_id = $2`, [taskIdsToRelease, req.user.id]);
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        }

        res.status(201).json({ message: 'Subreddit added to banned list.' });
    } catch (err) {
        console.error('Add banned subreddit error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// DELETE /api/auth/me/banned-subreddits/:subreddit
router.delete('/me/banned-subreddits/:subreddit', require('../middleware/auth'), async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM user_banned_subreddits WHERE user_id = $1 AND subreddit = $2',
            [req.user.id, req.params.subreddit.toLowerCase()]
        );
        res.json({ message: 'Subreddit removed from banned list.' });
    } catch (err) {
        console.error('Delete banned subreddit error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

module.exports = router;
