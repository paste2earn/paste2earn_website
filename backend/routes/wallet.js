const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/wallet - wallet stats + transactions + pending withdrawals
router.get('/', auth, async (req, res) => {
    try {
        const uid = req.user.id;

        const [userRes, txRes, earningsRes, withdrawalsRes, pendingRes] = await Promise.all([
            pool.query('SELECT wallet_balance FROM users WHERE id = $1', [uid]),
            pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [uid]),
            pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = $1 AND type = 'earning'`, [uid]),
            pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM withdrawal_requests WHERE user_id = $1 AND status = 'paid'`, [uid]),
            pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM withdrawal_requests WHERE user_id = $1 AND status = 'pending'`, [uid]),
        ]);

        const withdrawalList = await pool.query(
            'SELECT * FROM withdrawal_requests WHERE user_id = $1 ORDER BY created_at DESC',
            [uid]
        );

        res.json({
            balance: parseFloat(userRes.rows[0]?.wallet_balance || 0),
            total_earnings: parseFloat(earningsRes.rows[0].total),
            total_withdrawals: parseFloat(withdrawalsRes.rows[0].total),
            pending_balance: parseFloat(pendingRes.rows[0].total),
            transactions: txRes.rows,
            withdrawal_requests: withdrawalList.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/wallet/withdraw - request a USDT/Binance withdrawal
router.post('/withdraw', auth, async (req, res) => {
    const { amount, wallet_address, wallet_type } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: 'Please enter a valid amount.' });
    }
    if (!wallet_address || wallet_address.trim().length < 3) {
        return res.status(400).json({ message: 'Valid wallet address or Binance ID is required.' });
    }
    if (!wallet_type || !['usdt_bep20', 'usdt_polygon', 'binance_id'].includes(wallet_type)) {
        return res.status(400).json({ message: 'Valid wallet type is required (USDT BEP20, USDT Polygon, or Binance ID).' });
    }

    const withdrawAmount = parseFloat(parseFloat(amount).toFixed(2));

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check available balance
        const userRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
        const available = parseFloat(userRes.rows[0].wallet_balance);

        if (withdrawAmount > available) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Insufficient balance. Available: $${available.toFixed(2)}.` });
        }

        // Deduct from wallet immediately (holds the amount)
        await client.query(
            'UPDATE users SET wallet_balance = wallet_balance - $1, updated_at = NOW() WHERE id = $2',
            [withdrawAmount, req.user.id]
        );

        // Create withdrawal request
        const wrRes = await client.query(
            `INSERT INTO withdrawal_requests (user_id, amount, wallet_address, wallet_type, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
            [req.user.id, withdrawAmount, wallet_address.trim(), wallet_type]
        );

        const walletLabel = wallet_type === 'binance_id' ? 'Binance ID' : wallet_type === 'usdt_bep20' ? 'USDT (BEP20)' : 'USDT (Polygon)';

        // Log transaction
        await client.query(
            `INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, 'withdrawal_pending', $3)`,
            [req.user.id, withdrawAmount, `Withdrawal to ${walletLabel} (pending review)`]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Withdrawal request submitted. Admin will review and pay manually.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    } finally {
        client.release();
    }
});

module.exports = router;
