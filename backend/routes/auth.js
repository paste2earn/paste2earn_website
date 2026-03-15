const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password, reddit_profile_url } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    if (!reddit_profile_url) {
        return res.status(400).json({ message: 'Reddit profile URL is required.' });
    }

    try {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Email or username already exists.' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, reddit_profile_url, role, status)
       VALUES ($1, $2, $3, $4, 'user', 'pending')
       RETURNING id, username, email, role, status, reddit_profile_url, wallet_balance, tier`,
            [username, email, password_hash, reddit_profile_url]
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
                wallet_balance: newUser.wallet_balance
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

module.exports = router;
