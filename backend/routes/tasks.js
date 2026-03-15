const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET /api/tasks - list all active tasks (approved users only)
router.get('/', auth, async (req, res) => {
    try {
        // Get user's tier
        const userResult = await pool.query('SELECT tier FROM users WHERE id = $1', [req.user.id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const userTier = userResult.rows[0].tier || 'silver';

        // Build type filter based on tier
        // Silver users can only see comment and reply tasks
        // Gold users can see all tasks (comment, reply, and post)
        const typeCondition = userTier === 'silver'
            ? `AND t.type IN ('comment', 'reply')`  // Silver: only comment/reply tasks
            : ``;  // Gold: all tasks

        const result = await pool.query(
            `SELECT t.*,
        CASE WHEN ct.id IS NOT NULL THEN true ELSE false END AS claimed,
        ct.status AS claim_status
       FROM tasks t
       LEFT JOIN claimed_tasks ct ON ct.task_id = t.id AND ct.user_id = $1
       WHERE t.status = 'active' ${typeCondition}
       ORDER BY t.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET /api/tasks/cooldowns - get cooldown times for the user
router.get('/cooldowns', auth, async (req, res) => {
    try {
        const types = ['comment', 'reply', 'post'];
        const cooldowns = {};

        for (const type of types) {
            const cooldownHours = type === 'post' ? 12 : 5;
            const cooldownRes = await pool.query(`
                SELECT ct.created_at
                FROM claimed_tasks ct
                JOIN tasks t ON t.id = ct.task_id
                WHERE ct.user_id = $1 AND t.type = $2 AND ct.created_at > NOW() - INTERVAL '1 hour' * $3
                ORDER BY ct.created_at DESC
                LIMIT 1
            `, [req.user.id, type, cooldownHours]);

            if (cooldownRes.rows.length > 0) {
                const lastClaim = new Date(cooldownRes.rows[0].created_at);
                cooldowns[type] = new Date(lastClaim.getTime() + cooldownHours * 60 * 60 * 1000).toISOString();
            } else {
                cooldowns[type] = null; // null means Ready
            }
        }

        res.json(cooldowns);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/tasks/:id/claim - claim a task
router.post('/:id/claim', auth, async (req, res) => {
    const taskId = req.params.id;
    try {
        // Check task exists and is active
        const taskRes = await pool.query('SELECT * FROM tasks WHERE id = $1 AND status = $2', [taskId, 'active']);
        if (taskRes.rows.length === 0) {
            return res.status(404).json({ message: 'Task not found or inactive.' });
        }
        const task = taskRes.rows[0];

        // Check user tier - Silver users cannot claim post tasks
        const userResult = await pool.query('SELECT tier FROM users WHERE id = $1', [req.user.id]);
        const userTier = userResult.rows[0]?.tier || 'silver';

        if (userTier === 'silver' && task.type === 'post') {
            return res.status(403).json({
                message: 'Post tasks are only available for Gold tier users (1000+ karma, 1+ year account).'
            });
        }

        // Cooldown check: 5 hours for comment/reply, 12 hours for post
        const cooldownHours = task.type === 'post' ? 12 : 5;
        const cooldownRes = await pool.query(`
            SELECT ct.created_at
            FROM claimed_tasks ct
            JOIN tasks t ON t.id = ct.task_id
            WHERE ct.user_id = $1 AND t.type = $2 AND ct.created_at > NOW() - INTERVAL '1 hour' * $3
            ORDER BY ct.created_at DESC
            LIMIT 1
        `, [req.user.id, task.type, cooldownHours]);

        if (cooldownRes.rows.length > 0) {
            const lastClaim = new Date(cooldownRes.rows[0].created_at);
            const nextClaim = new Date(lastClaim.getTime() + cooldownHours * 60 * 60 * 1000);
            return res.status(400).json({
                message: `You can only claim one ${task.type} task every ${cooldownHours} hours. Next available at: ${nextClaim.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                cooldown: true
            });
        }

        // Check not already claimed
        const existing = await pool.query(
            'SELECT id FROM claimed_tasks WHERE user_id = $1 AND task_id = $2',
            [req.user.id, taskId]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'You have already claimed this task.' });
        }

        // Use a transaction to claim task AND deactivate it atomically
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(
                `INSERT INTO claimed_tasks (user_id, task_id, status) VALUES ($1, $2, 'claimed') RETURNING *`,
                [req.user.id, taskId]
            );
            // Auto-deactivate: only 1 user per task
            await client.query(
                `UPDATE tasks SET status = 'inactive' WHERE id = $1`,
                [taskId]
            );
            await client.query('COMMIT');
            res.status(201).json({ message: 'Task claimed successfully.', claim: result.rows[0] });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/tasks/:id/submit - submit proof for a claimed task
router.post('/:id/submit', auth, async (req, res) => {
    const taskId = req.params.id;
    const { submitted_url, comment1, comment2, comment3 } = req.body;

    if (!submitted_url) {
        return res.status(400).json({ message: 'Submission URL is required.' });
    }

    try {
        const claim = await pool.query(
            `SELECT ct.*, t.type, t.target_url FROM claimed_tasks ct
       JOIN tasks t ON t.id = ct.task_id
       WHERE ct.user_id = $1 AND ct.task_id = $2`,
            [req.user.id, taskId]
        );

        if (claim.rows.length === 0) {
            return res.status(404).json({ message: 'Claimed task not found.' });
        }

        const ct = claim.rows[0];
        if (!['claimed', 'revision_needed'].includes(ct.status)) {
            return res.status(400).json({ message: `Task is already ${ct.status}. You cannot resubmit.` });
        }

        // For comment/reply tasks, validations
        if (ct.type === 'comment' || ct.type === 'reply') {
            if (!comment1 || !comment2 || !comment3) {
                return res.status(400).json({ message: 'Please provide 3 random comments for comment tasks.' });
            }

            const getSubreddit = (urlStr) => {
                try {
                    const match = new URL(urlStr).pathname.match(/\/r\/([^\/]+)/i);
                    return match ? match[1].toLowerCase() : null;
                } catch { return null; }
            };

            const comments = [comment1, comment2, comment3].map(url => url.split('?')[0]);

            // Should not just be the target task link
            const targetBase = ct.target_url ? ct.target_url.split('?')[0] : '';
            if (comments.some(c => c === targetBase || c === submitted_url.split('?')[0])) {
                return res.status(400).json({ message: 'Random comments must be different from the main task link.' });
            }

            // Check if all 3 are in different subreddits
            const subreddits = comments.map(getSubreddit).filter(Boolean);
            if (subreddits.length < 3) {
                return res.status(400).json({ message: 'All 3 comments must be valid Reddit URLs.' });
            }

            const uniqueSubs = new Set(subreddits);
            if (uniqueSubs.size < 3) {
                return res.status(400).json({ message: 'The 3 random comments must be in 3 different subreddits.' });
            }

            // Strip queries from the saved URLs
            comment1 = comments[0];
            comment2 = comments[1];
            comment3 = comments[2];
        }

        // Also strip main submitted_url
        const clean_submitted_url = submitted_url.split('?')[0];

        const result = await pool.query(
            `UPDATE claimed_tasks
       SET status = 'submitted', submitted_url = $1, comment1 = $2, comment2 = $3, comment3 = $4, updated_at = NOW()
       WHERE user_id = $5 AND task_id = $6
       RETURNING *`,
            [clean_submitted_url, comment1 || null, comment2 || null, comment3 || null, req.user.id, taskId]
        );

        res.json({ message: claim.rows[0].status === 'claimed' ? 'Submission received! Awaiting admin verification.' : 'Resubmission received! Admin will re-review your work.', claim: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET /api/tasks/my - get user's claimed tasks
router.get('/my', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ct.*, t.title, t.type, t.target_url, t.comment_text, t.subreddit_url, t.post_title, t.post_body, t.reward, t.description
       FROM claimed_tasks ct
       JOIN tasks t ON t.id = ct.task_id
       WHERE ct.user_id = $1
       ORDER BY ct.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/tasks/:id/report - submit a report for a claimed task
router.post('/:id/report', auth, async (req, res) => {
    const taskId = req.params.id;
    const { reason, details } = req.body;

    if (!reason) {
        return res.status(400).json({ message: 'Reason for report is required.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check claim exists
        const claimRes = await client.query('SELECT * FROM claimed_tasks WHERE user_id = $1 AND task_id = $2', [req.user.id, taskId]);
        if (claimRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Task not claimed by you.' });
        }
        if (claimRes.rows[0].status !== 'claimed') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Only tasks in To Do status can be reported.' });
        }

        // Check the 3 recent/pending reports limit
        const pendingReportsRes = await client.query(
            `SELECT COUNT(*) FROM task_reports WHERE user_id = $1 AND status = 'pending'`,
            [req.user.id]
        );
        if (parseInt(pendingReportsRes.rows[0].count) >= 3) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Maximum 3 pending reports allowed at a time.' });
        }

        // Insert report
        await client.query(
            `INSERT INTO task_reports (user_id, task_id, reason, details) VALUES ($1, $2, $3, $4)`,
            [req.user.id, taskId, reason, details || null]
        );

        // Update claim status
        await client.query(
            `UPDATE claimed_tasks SET status = 'reported', updated_at = NOW() WHERE user_id = $1 AND task_id = $2`,
            [req.user.id, taskId]
        );

        await client.query('COMMIT');
        res.status(201).json({ message: 'Task reported successfully. Admin will review your report.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    } finally {
        client.release();
    }
});

module.exports = router;
