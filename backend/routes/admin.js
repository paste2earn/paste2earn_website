const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const adminGuard = require('../middleware/adminGuard');
const { sendTaskNotification, sendDirectMessageByUsername } = require('../services/discordBot');
const { sendApprovalEmail, sendRejectionEmail, sendBanEmail } = require('../services/emailService');
const multer = require('multer');
const XLSX = require('xlsx');

// Multer: store uploaded file in memory (no disk writes needed)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
            'application/csv',
        ];
        if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Only .xlsx, .xls, or .csv files are allowed.'));
        }
    }
});

// All admin routes require auth + admin role
router.use(auth, adminGuard);

// GET /api/admin/users - list all users with optional search
router.get('/users', async (req, res) => {
    const { search } = req.query;
    try {
        let query = `
            SELECT u.id, u.username, u.email, u.role, u.status, u.tier,
                   u.reddit_profile_url, u.discord_username, u.discord_verified, u.wallet_balance, u.created_at,
                   a.username AS approved_by_name
            FROM users u
            LEFT JOIN users a ON a.id = u.approved_by
        `;
        let params = [];

        if (search) {
            query += ` WHERE u.username ILIKE $1 OR u.email ILIKE $1 OR u.id::text = $2`;
            params = [`%${search}%`, search];
        }

        query += ` ORDER BY u.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// PATCH /api/admin/users/:id/status - approve or reject user
router.patch('/users/:id/status', async (req, res) => {
    const { status, tier } = req.body;
    if (!['approved', 'rejected', 'banned'].includes(status)) {
        return res.status(400).json({ message: 'Status must be approved, rejected, or banned.' });
    }

    // Validate tier if status is approved (only if it wasn't already approved)
    if (status === 'approved' && (!tier || !['gold', 'silver'].includes(tier))) {
        return res.status(400).json({ message: 'Valid tier (gold or silver) is required when approving users.' });
    }

    try {
        const userTier = status === 'approved' ? tier : 'silver';

        const result = await pool.query(
            `UPDATE users SET status = $1, tier = $2, approved_by = $3, updated_at = NOW()
             WHERE id = $4 AND role = 'user' RETURNING id, username, email, status, tier`,
            [status, userTier, req.user.id, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const updatedUser = result.rows[0];

        if (status === 'approved') {
            sendApprovalEmail(updatedUser).catch(err => {
                console.error('Failed to send approval email:', err);
            });
        } else if (status === 'rejected') {
            sendRejectionEmail(updatedUser).catch(err => {
                console.error('Failed to send rejection email:', err);
            });
        } else if (status === 'banned') {
            // Fetch discord_username since it's needed for DM
            const userFull = await pool.query('SELECT discord_username FROM users WHERE id = $1', [updatedUser.id]);
            const dUsername = userFull.rows[0]?.discord_username;

            sendBanEmail(updatedUser).catch(err => console.error('Failed to send ban email:', err));
            
            if (dUsername) {
                const banMsg = `⚠️ **Important Update Regarding Your Paste2Earn Account**\n\n` +
                    `Hello ${updatedUser.username}, your account has been **blocked/banned** due to platform violations. ` +
                    `You can no longer claim tasks or withdraw. Please contact admins if you wish to appeal.`;
                sendDirectMessageByUsername(dUsername, banMsg).catch(err => console.error('Failed to send ban DM:', err));
            }
        }

        res.json({
            message: `User ${status} successfully${status === 'approved' ? ` as ${tier === 'gold' ? 'Gold' : 'Silver'}` : ''}.`,
            user: updatedUser
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// PATCH /api/admin/users/:id/tier - change user tier
router.patch('/users/:id/tier', async (req, res) => {
    const { tier } = req.body;
    if (!tier || !['gold', 'silver'].includes(tier)) {
        return res.status(400).json({ message: 'Valid tier (gold or silver) is required.' });
    }

    try {
        const result = await pool.query(
            `UPDATE users SET tier = $1, updated_at = NOW()
             WHERE id = $2 AND role = 'user' AND status = 'approved'
             RETURNING id, username, email, tier`,
            [tier, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found or not approved.' });
        }

        res.json({
            message: `User upgraded to ${tier === 'gold' ? 'Gold' : 'Silver'} successfully.`,
            user: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// PATCH /api/admin/users/:id/role - promote user to admin
router.patch('/users/:id/role', async (req, res) => {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ message: 'Role must be admin or user.' });
    }
    try {
        const result = await pool.query(
            `UPDATE users SET role = $1::varchar,
             tier = CASE WHEN $2 = 'admin' THEN 'gold'::varchar ELSE tier END,
             updated_at = NOW()
             WHERE id = $3
             RETURNING id, username, email, role, tier`,
            [role, role, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ message: `User is now ${role === 'admin' ? 'an Admin' : 'a regular User'}.`, user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET /api/admin/stats - dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const [usersRes, tasksRes, submissionsRes, pendingRes] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']),
            pool.query('SELECT COUNT(*) FROM tasks WHERE status = $1', ['active']),
            pool.query('SELECT COUNT(*) FROM claimed_tasks WHERE status = $1', ['submitted']),
            pool.query('SELECT COUNT(*) FROM users WHERE status = $1 AND role = $2', ['pending', 'user'])
        ]);
        res.json({
            total_users: parseInt(usersRes.rows[0].count),
            active_tasks: parseInt(tasksRes.rows[0].count),
            pending_submissions: parseInt(submissionsRes.rows[0].count),
            pending_approvals: parseInt(pendingRes.rows[0].count)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// Helper: extract readable title from a Reddit URL
function titleFromUrl(url) {
    try {
        const parts = new URL(url).pathname.split('/').filter(Boolean);
        // e.g. /r/sub/comments/id/slug  => slug is last segment
        const slug = parts[parts.length - 1] || parts[parts.length - 2] || 'reddit-task';
        return slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    } catch {
        return 'Comment Task';
    }
}

// POST /api/admin/tasks - create a new task
router.post('/tasks', async (req, res) => {
    const { type, title, description, target_url, comment_text, subreddit_url, post_title, post_body, reward } = req.body;

    if (!type || !reward) {
        return res.status(400).json({ message: 'Type and reward are required.' });
    }
    if (!['comment', 'post', 'reply'].includes(type)) {
        return res.status(400).json({ message: 'Type must be comment, post, or reply.' });
    }
    if ((type === 'comment' || type === 'reply') && !target_url) {
        return res.status(400).json({ message: 'Target URL is required for comment and reply tasks.' });
    }
    if (type === 'post' && !subreddit_url) {
        return res.status(400).json({ message: 'Subreddit URL is required for post tasks.' });
    }

    // Auto-generate title from URL for both task types
    let finalTitle;
    if (type === 'comment') {
        finalTitle = titleFromUrl(target_url);
    } else if (type === 'reply') {
        finalTitle = 'Reply to Comment';
    } else {
        // Extract subreddit name: /r/SubName/ → "Post in r/SubName"
        try {
            const parts = new URL(subreddit_url).pathname.split('/').filter(Boolean);
            const sub = parts[1] || 'subreddit';
            finalTitle = `Post in r/${sub}`;
        } catch {
            finalTitle = 'Post Task';
        }
    }

    try {
        const result = await pool.query(
            `INSERT INTO tasks (type, title, description, target_url, comment_text, subreddit_url, post_title, post_body, reward, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10) RETURNING *`,
            [type, finalTitle, description || null, target_url || null, comment_text || null,
                subreddit_url || null, post_title || null, post_body || null, reward, req.user.id]
        );

        const task = result.rows[0];

        // Send Discord notification
        sendTaskNotification(task).catch(err => {
            console.error('Discord notification failed:', err);
        });

        res.status(201).json({ message: 'Task created successfully.', task });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET /api/admin/tasks - list all tasks with optional search
router.get('/tasks', async (req, res) => {
    const { search } = req.query;
    try {
        let query = `
            SELECT * FROM (
                SELECT DISTINCT ON (t.id)
                       t.*, a.username AS created_by_name,
                       ct.status AS claim_status,
                       u.username AS claimed_by_username
                FROM tasks t
                LEFT JOIN users a ON a.id = t.created_by
                LEFT JOIN claimed_tasks ct ON ct.task_id = t.id
                LEFT JOIN users u ON u.id = ct.user_id
        `;
        let params = [];

        if (search) {
            query += ` WHERE t.title ILIKE $1 OR t.id::text = $2 OR t.target_url ILIKE $1`;
            params = [`%${search}%`, search];
        }

        query += ` ORDER BY t.id, ct.created_at DESC
            ) AS subquery
            ORDER BY subquery.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// PATCH /api/admin/tasks/:id/status - toggle task active/inactive
router.patch('/tasks/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ message: 'Status must be active or inactive.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // if activating, prevent it if the task is already fully completed
        if (status === 'active') {
            const checkRes = await client.query(
                `SELECT * FROM claimed_tasks WHERE task_id = $1 AND status = 'approved'`,
                [req.params.id]
            );
            if (checkRes.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Cannot activate a task that is already completed and paid.' });
            }
        }

        const result = await client.query(
            'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
            [status, req.params.id]
        );
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Task not found.' });
        }

        // If an admin manually deactivates a task
        if (status === 'inactive') {
            const checkSubmitted = await client.query(
                `SELECT * FROM claimed_tasks WHERE task_id = $1 AND status IN ('submitted', 'revision_needed')`,
                [req.params.id]
            );
            if (checkSubmitted.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Cannot deactivate a task while it has a submission awaiting review or in revision.' });
            }

            // pull it back from any user that hasn't submitted yet (removes working status)
            await client.query(
                `DELETE FROM claimed_tasks WHERE task_id = $1 AND status = 'claimed'`,
                [req.params.id]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Task updated.', task: result.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    } finally {
        client.release();
    }
});

// GET /api/admin/submissions - list all pending submissions
router.get('/submissions', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ct.*, u.username, u.email,
              t.title AS task_title, t.type AS task_type, t.reward, t.target_url,
              a.username AS reviewed_by_name
       FROM claimed_tasks ct
       JOIN users u ON u.id = ct.user_id
       JOIN tasks t ON t.id = ct.task_id
       LEFT JOIN users a ON a.id = ct.reviewed_by
       WHERE ct.status = 'submitted'
       ORDER BY ct.updated_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET /api/admin/submissions/all - all submissions with search
router.get('/submissions/all', async (req, res) => {
    const { search } = req.query;
    try {
        let query = `
            SELECT ct.*, u.username, u.email,
                   t.title AS task_title, t.type AS task_type, t.reward, t.target_url,
                   a.username AS reviewed_by_name
            FROM claimed_tasks ct
            JOIN users u ON u.id = ct.user_id
            JOIN tasks t ON t.id = ct.task_id
            LEFT JOIN users a ON a.id = ct.reviewed_by
        `;
        let params = [];

        if (search) {
            query += ` WHERE u.username ILIKE $1 OR u.email ILIKE $1 OR t.title ILIKE $1 OR ct.task_id::text = $2`;
            params = [`%${search}%`, search];
        }

        query += ` ORDER BY ct.updated_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// PATCH /api/admin/submissions/:id - approve, request revision, or reject a submission
router.patch('/submissions/:id', async (req, res) => {
    const { status, admin_note, rejection_reason } = req.body;
    if (!['approved', 'rejected', 'revision_needed'].includes(status)) {
        return res.status(400).json({ message: 'Status must be approved, rejected, or revision_needed.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const subRes = await client.query(
            `SELECT ct.*, t.reward, t.type FROM claimed_tasks ct
       JOIN tasks t ON t.id = ct.task_id
       WHERE ct.id = $1 AND ct.status = 'submitted'`,
            [req.params.id]
        );

        if (subRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Submission not found or not pending.' });
        }

        const submission = subRes.rows[0];

        // For revision_needed: just send back with note, no wallet action
        if (status === 'revision_needed') {
            await client.query(
                `UPDATE claimed_tasks SET status = 'revision_needed', admin_note = $1, reviewed_by = $2, updated_at = NOW() WHERE id = $3`,
                [admin_note || null, req.user.id, req.params.id]
            );
            await client.query('COMMIT');
            return res.json({ message: 'Submission sent back to user for revision.' });
        }

        await client.query(
            `UPDATE claimed_tasks SET status = $1, admin_note = $2, rejection_reason = $3, reviewed_by = $4, updated_at = NOW() WHERE id = $5`,
            [status, admin_note || null, rejection_reason || null, req.user.id, req.params.id]
        );

        // If approved, credit wallet
        if (status === 'approved') {
            await client.query(
                'UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = NOW() WHERE id = $2',
                [submission.reward, submission.user_id]
            );
            await client.query(
                `INSERT INTO transactions (user_id, amount, type, description)
         VALUES ($1, $2, 'earning', $3)`,
                [submission.user_id, submission.reward, `Earned for ${submission.type} task #${submission.task_id} approval`]
            );
        }

        await client.query('COMMIT');
        res.json({ message: `Submission ${status} successfully.` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    } finally {
        client.release();
    }
});

// GET /api/admin/withdrawals - list all withdrawal requests
// GET /api/admin/withdrawals - list all withdrawal requests with search
router.get('/withdrawals', async (req, res) => {
    const { search } = req.query;
    try {
        let query = `
            SELECT wr.*, u.username, u.email,
                   a.username AS reviewed_by_name
            FROM withdrawal_requests wr
            JOIN users u ON u.id = wr.user_id
            LEFT JOIN users a ON a.id = wr.reviewed_by
        `;
        let params = [];
        if (search) {
            query += ` WHERE u.username ILIKE $1 OR u.email ILIKE $1 OR wr.wallet_address ILIKE $1 OR wr.id::text = $2`;
            params = [`%${search}%`, search];
        }
        query += ` ORDER BY wr.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// PATCH /api/admin/withdrawals/:id - mark paid or rejected
router.patch('/withdrawals/:id', async (req, res) => {
    const { status, admin_note } = req.body;
    if (!['paid', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Status must be paid or rejected.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const wrRes = await client.query(
            `SELECT * FROM withdrawal_requests WHERE id = $1 AND status = 'pending'`,
            [req.params.id]
        );
        if (wrRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Withdrawal request not found or already processed.' });
        }

        const wr = wrRes.rows[0];

        // Update request
        await client.query(
            `UPDATE withdrawal_requests SET status = $1, admin_note = $2, reviewed_by = $3, updated_at = NOW() WHERE id = $4`,
            [status, admin_note || null, req.user.id, wr.id]
        );

        const likeDesc = `Withdrawal to%`;

        const walletLabel = wr.wallet_type === 'binance_id' ? 'Binance ID' :
            wr.wallet_type === 'usdt_bep20' ? 'USDT (BEP20)' :
                wr.wallet_type === 'usdt_polygon' ? 'USDT (Polygon)' :
                    wr.wallet_type === 'upi' ? 'UPI' : 'UPI';

        if (status === 'paid') {
            // Update the existing pending transaction to completed
            await client.query(
                `UPDATE transactions SET type = 'withdrawal', description = $1, created_at = NOW() WHERE user_id = $2 AND description LIKE $3`,
                [`Withdrawal to ${walletLabel} completed`, wr.user_id, likeDesc]
            );
        } else {
            // Rejected — refund wallet balance
            await client.query(
                'UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = NOW() WHERE id = $2',
                [wr.amount, wr.user_id]
            );
            // Update the existing pending transaction to refunded
            await client.query(
                `UPDATE transactions SET type = 'refund', description = $1, created_at = NOW() WHERE user_id = $2 AND description LIKE $3`,
                [`Withdrawal rejected — amount refunded to wallet`, wr.user_id, likeDesc]
            );
        }

        await client.query('COMMIT');
        res.json({ message: `Withdrawal ${status} successfully.` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    } finally {
        client.release();
    }
});

// GET /api/admin/reports - list all task reports
router.get('/reports', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT tr.*, u.username, u.email, t.title as task_title, t.type as task_type, t.target_url, t.status as task_status
             FROM task_reports tr
             JOIN users u ON u.id = tr.user_id
             JOIN tasks t ON t.id = tr.task_id
             ORDER BY tr.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST /api/admin/tasks/:id/release - manually release task back to pool
router.post('/tasks/:id/release', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get task info
        const taskRes = await client.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
        if (taskRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Task not found.' });
        }

        const task = taskRes.rows[0];

        // Ensure task has not already been completed and paid
        const checkRes = await client.query(`SELECT 1 FROM claimed_tasks WHERE task_id = $1 AND status = 'approved'`, [req.params.id]);
        if (checkRes.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Cannot release a task that is already completed and paid.' });
        }

        // Delete any claimed_tasks for this task
        await client.query('DELETE FROM claimed_tasks WHERE task_id = $1', [req.params.id]);

        // Set task to active
        await client.query('UPDATE tasks SET status = $1 WHERE id = $2', ['active', req.params.id]);

        await client.query('COMMIT');

        // Send Discord notification for re-released task
        sendTaskNotification({ ...task, status: 'active' }).catch(err => {
            console.error('Discord notification failed:', err);
        });

        res.json({ message: 'Task released back to pool successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    } finally {
        client.release();
    }
});

// PATCH /api/admin/reports/:id - approve or reject a report
router.patch('/reports/:id', async (req, res) => {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Status must be approved or rejected.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const reportRes = await client.query(
            `SELECT * FROM task_reports WHERE id = $1 AND status = 'pending'`,
            [req.params.id]
        );
        if (reportRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Report not found or already processed.' });
        }

        const report = reportRes.rows[0];

        // Update report status
        await client.query(
            `UPDATE task_reports SET status = $1, updated_at = NOW() WHERE id = $2`,
            [status, report.id]
        );

        if (status === 'approved') {
            // Cancel the claim so the user no longer has it, and cooldown resets for this task (since it's deleted)
            await client.query(
                `DELETE FROM claimed_tasks WHERE user_id = $1 AND task_id = $2`,
                [report.user_id, report.task_id]
            );
            // Release task back to active pool
            await client.query(
                `UPDATE tasks SET status = 'active' WHERE id = $1`,
                [report.task_id]
            );

            // Get task details for Discord notification
            const taskRes = await client.query('SELECT * FROM tasks WHERE id = $1', [report.task_id]);
            if (taskRes.rows.length > 0) {
                const task = taskRes.rows[0];
                sendTaskNotification(task).catch(err => {
                    console.error('Discord notification failed:', err);
                });
            }
        } else if (status === 'rejected') {
            // Return to claimed status so they can still submit it
            await client.query(
                `UPDATE claimed_tasks SET status = 'claimed', updated_at = NOW() WHERE user_id = $1 AND task_id = $2`,
                [report.user_id, report.task_id]
            );
        }

        await client.query('COMMIT');
        res.json({ message: `Report ${status} successfully.${status === 'approved' ? ' Task returned to pool.' : ''}` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    } finally {
        client.release();
    }
});

// POST /api/admin/tasks/bulk-upload - upload Excel/CSV file to create multiple tasks
router.post('/tasks/bulk-upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Parse the workbook from the buffer
    let workbook;
    try {
        workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    } catch (err) {
        return res.status(400).json({ message: 'Could not parse file. Make sure it is a valid Excel or CSV file.' });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows || rows.length === 0) {
        return res.status(400).json({ message: 'The file is empty or has no data rows.' });
    }

    const VALID_TYPES = ['comment', 'post', 'reply'];
    const created = [];
    const failed = [];

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // 1-indexed, +1 for header row

            // Normalize keys (trim whitespace, lowercase)
            const normalize = (obj) => {
                const out = {};
                for (const k of Object.keys(obj)) {
                    out[k.trim().toLowerCase().replace(/ /g, '_')] = typeof obj[k] === 'string' ? obj[k].trim() : obj[k];
                }
                return out;
            };
            const r = normalize(row);

            const type = (r.type || '').toLowerCase();
            const reward = parseFloat(r.reward);
            const target_url = r.target_url || r.reddit_post_url || '';
            const subreddit_url = r.subreddit_url || '';
            const comment_text = r.comment_text || r.comment || '';
            const post_title = r.post_title || '';
            const post_body = r.post_body || '';
            const description = r.description || null;

            // Validation
            const errors = [];
            if (!VALID_TYPES.includes(type)) {
                errors.push(`Invalid type "${r.type}" — must be comment, reply, or post`);
            }
            if (!reward || isNaN(reward) || reward <= 0) {
                errors.push('Reward must be a positive number');
            }
            if ((type === 'comment' || type === 'reply') && !target_url) {
                errors.push('target_url is required for comment/reply tasks');
            }
            if (type === 'post' && !subreddit_url) {
                errors.push('subreddit_url is required for post tasks');
            }

            if (errors.length > 0) {
                failed.push({ row: rowNum, errors, data: r });
                continue;
            }

            // Auto-generate title
            let finalTitle;
            if (type === 'comment') {
                finalTitle = titleFromUrl(target_url);
            } else if (type === 'reply') {
                finalTitle = 'Reply to Comment';
            } else {
                try {
                    const parts = new URL(subreddit_url).pathname.split('/').filter(Boolean);
                    const sub = parts[1] || 'subreddit';
                    finalTitle = `Post in r/${sub}`;
                } catch {
                    finalTitle = 'Post Task';
                }
            }

            try {
                const result = await client.query(
                    `INSERT INTO tasks (type, title, description, target_url, comment_text, subreddit_url, post_title, post_body, reward, status, created_by)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10) RETURNING *`,
                    [type, finalTitle, description, target_url || null, comment_text || null,
                        subreddit_url || null, post_title || null, post_body || null, reward, req.user.id]
                );
                created.push({ row: rowNum, task: result.rows[0] });
            } catch (dbErr) {
                failed.push({ row: rowNum, errors: [dbErr.message], data: r });
            }
        }

        await client.query('COMMIT');

        // Fire Discord notifications for each created task (non-blocking)
        for (const c of created) {
            sendTaskNotification(c.task).catch(err => {
                console.error('Discord notification failed for bulk task:', err);
            });
        }

        res.status(201).json({
            message: `Bulk upload complete. ${created.length} task(s) created, ${failed.length} row(s) failed.`,
            created: created.length,
            failed: failed.length,
            failedRows: failed,
            createdTasks: created.map(c => ({ id: c.task.id, type: c.task.type, title: c.task.title, reward: c.task.reward }))
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Bulk upload error:', err);
        res.status(500).json({ message: 'Server error during bulk upload.' });
    } finally {
        client.release();
    }
});

module.exports = router;

