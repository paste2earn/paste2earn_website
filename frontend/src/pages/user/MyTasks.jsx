import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { ExternalLink, Send, Copy, Check, AlertTriangle } from 'lucide-react';

const REPORT_REASONS = [
    'Subreddit is banned or private',
    'Content violates subreddit rules',
    'Post URL is broken or invalid',
    'Requirements are impossible to meet',
    'Thread was archived or locked',
    'Other (please specify)'
];

function ReportModal({ claim, onClose, onReported }) {
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!reason) return toast.error('Please select a reason.');
        setLoading(true);
        try {
            await api.post(`/tasks/${claim.task_id}/report`, { reason, details });
            toast.success('Report submitted! Admin will review it.');
            onReported();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit report.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">⚠️ Report Task #{claim.task_id}</span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Report this task if you encounter issues that prevent completion.<br />
                    Your cooldown will be reduced if the report is approved.
                </p>

                <div className="form-group">
                    <label className="form-label">Reason for Report *</label>
                    <select className="form-input" value={reason} onChange={e => setReason(e.target.value)}>
                        <option value="">Select a reason</option>
                        {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Additional Details</label>
                    <textarea className="form-input" rows={4} placeholder="Optional: Provide additional context..." value={details} onChange={e => setDetails(e.target.value)} />
                </div>

                <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>What happens next:</p>
                    <ul style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
                        <li>Admin will review your report</li>
                        <li>If approved: Task will be cancelled and your cooldown reduced by 1 cycle</li>
                        <li>If rejected: No changes will be made (you can continue the task)</li>
                        <li>You can have maximum 3 pending reports at a time</li>
                    </ul>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn" onClick={handleSubmit} disabled={loading}
                        style={{ flex: 1, background: 'linear-gradient(135deg,#dc2626,#991b1b)', border: 'none', color: '#fff', fontWeight: 600 }}>
                        {loading ? 'Submitting...' : 'Submit Report'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SubmitModal({ claim, onClose, onSubmitted }) {
    const task = claim;
    const [form, setForm] = useState({ submitted_url: '', comment1: '', comment2: '', comment3: '' });
    const [loading, setLoading] = useState(false);
    const [copiedContent, setCopiedContent] = useState(null);

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedContent(id);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopiedContent(null), 2000);
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/tasks/${task.task_id}/submit`, form);
            toast.success(task.status === 'revision_needed'
                ? 'Resubmission sent! Admin will re-review your work.'
                : 'Submission sent! Admin will review shortly.');
            onSubmitted();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Submission failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">
                        {task.status === 'revision_needed' ? '🔄 Resubmit Proof' : 'Submit Proof'}
                    </span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                {task.status === 'revision_needed' && task.admin_note && (
                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', marginBottom: 3 }}>⚠️ Admin Feedback</p>
                        <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{task.admin_note}</p>
                    </div>
                )}

                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    Task: <strong style={{ color: 'var(--text-primary)' }}>{task.title}</strong>
                </p>

                {(task.type === 'comment' || task.type === 'reply') && task.target_url && (
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                            {task.type === 'reply' ? 'Original Comment' : 'Original Post'}
                        </p>
                        <a href={task.target_url} target="_blank" rel="noreferrer" className="task-url">
                            {task.target_url} <ExternalLink size={11} style={{ display: 'inline' }} />
                        </a>
                        {task.comment_text && (
                            <>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, marginBottom: 6 }}>
                                    ✍️ <strong style={{ color: 'var(--accent-light)' }}>
                                        {task.type === 'reply' ? 'Reply to comment:' : 'Comment to post:'}
                                    </strong>
                                </p>
                                <div className="copy-box" style={{ border: '1px solid rgba(16,185,129,0.3)', color: 'var(--text-primary)', userSelect: 'all', paddingRight: 40, position: 'relative' }}>
                                    {task.comment_text}
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(task.comment_text, 'comment')}
                                        style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: 8, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: copiedContent === 'comment' ? 'var(--success)' : 'var(--text-muted)' }}
                                    >
                                        {copiedContent === 'comment' ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Click the icon to copy and paste this as your comment</p>
                            </>
                        )}
                    </div>
                )}

                {task.type === 'post' && task.subreddit_url && (
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Subreddit</p>
                        <a href={task.subreddit_url} target="_blank" rel="noreferrer" className="task-url">{task.subreddit_url}</a>
                        {task.post_title && <><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, marginBottom: 4 }}>Post Title to use</p>
                            <div className="copy-box" style={{ position: 'relative', paddingRight: 40 }}>{task.post_title}
                                <button type="button" onClick={() => handleCopy(task.post_title, 'title')} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: 8, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: copiedContent === 'title' ? 'var(--success)' : 'var(--text-muted)' }}>
                                    {copiedContent === 'title' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div></>}
                        {task.post_body && <><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, marginBottom: 4 }}>Post Body to use</p>
                            <div className="copy-box" style={{ position: 'relative', paddingRight: 40 }}>{task.post_body}
                                <button type="button" onClick={() => handleCopy(task.post_body, 'body')} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: 8, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: copiedContent === 'body' ? 'var(--success)' : 'var(--text-muted)' }}>
                                    {copiedContent === 'body' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div></>}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">
                            {(task.type === 'comment' || task.type === 'reply') ? 'URL of your comment' : 'URL of your post'} *
                        </label>
                        <input
                            type="url"
                            className="form-input"
                            placeholder="https://reddit.com/r/..."
                            value={form.submitted_url}
                            onChange={e => {
                                let val = e.target.value;
                                if (val.includes('?')) val = val.split('?')[0];
                                setForm({ ...form, submitted_url: val });
                            }}
                            required
                        />
                    </div>

                    {(task.type === 'comment' || task.type === 'reply') && (
                        <>
                            <div className="alert alert-info" style={{ marginBottom: 14 }}>
                                📋 Paste links to 3 random comments from <strong>3 DIFFERENT subreddits</strong> (do not paste the main task link!).
                            </div>
                            {[1, 2, 3].map(n => (
                                <div className="form-group" key={n}>
                                    <label className="form-label">Comment {n} *</label>
                                    <input
                                        type="url"
                                        className="form-input"
                                        placeholder={`https://reddit.com/r/...`}
                                        value={form[`comment${n}`]}
                                        onChange={e => {
                                            let val = e.target.value;
                                            if (val.includes('?')) val = val.split('?')[0];
                                            setForm({ ...form, [`comment${n}`]: val });
                                        }}
                                        required
                                    />
                                </div>
                            ))}
                        </>
                    )}

                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
                            <Send size={16} />{loading ? 'Submitting...' : 'Submit for Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const STATUS_FILTERS = ['claimed', 'submitted', 'revision_needed', 'reported', 'approved', 'rejected'];
const STATUS_LABELS = { claimed: 'To Do', submitted: 'Under Review', revision_needed: 'Waiting', reported: 'Reported', approved: 'Completed', rejected: 'Failed' };

export default function MyTasks() {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [reportTarget, setReportTarget] = useState(null);
    const [filter, setFilter] = useState('claimed');

    const fetchMyClaims = async () => {
        setLoading(true);
        try {
            const res = await api.get('/tasks/my');
            setClaims(res.data);
        } catch {
            toast.error('Failed to load your tasks.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMyClaims(); }, []);

    const filtered = claims.filter(c => c.status === filter);

    const statusColor = s => ({
        claimed: 'badge-claimed',
        submitted: 'badge-submitted',
        approved: 'badge-approved',
        rejected: 'badge-rejected',
        revision_needed: 'badge-pending',
        reported: 'badge-pending'
    }[s] || 'badge-claimed');

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">My <span>Tasks</span></h1>
                <p className="page-subtitle">View your claimed tasks and submit proof of completion.</p>
            </div>

            <div className="filter-buttons" style={{ marginBottom: 24 }}>
                {STATUS_FILTERS.map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ whiteSpace: 'nowrap' }}>
                        {STATUS_LABELS[f]} ({claims.filter(s => s.status === f).length})
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="spinner" />
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <Send />
                    <p>No tasks found in <strong>{STATUS_LABELS[filter]}</strong>.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {filtered.map(claim => (
                        <div key={claim.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{claim.task_id}</span>
                                        <span className={`badge badge-${claim.task_type || claim.type}`}>{(claim.task_type || claim.type) === 'reply' ? 'REPLY' : (claim.task_type || claim.type)?.toUpperCase()}</span>
                                        <span className={`badge ${statusColor(claim.status)}`}>{claim.status?.replace('_', ' ')?.toUpperCase()}</span>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-light)' }}>
                                            ${parseFloat(claim.reward).toFixed(2)}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{claim.title}</h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        Claimed on {new Date(claim.created_at).toLocaleDateString()}
                                    </p>
                                    {claim.admin_note && claim.status === 'rejected' && (
                                        <div className="alert alert-error" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
                                            ❌ <strong>Rejected:</strong> {claim.admin_note}
                                        </div>
                                    )}
                                    {claim.status === 'revision_needed' && (
                                        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, padding: '10px 14px', marginTop: 10 }}>
                                            <p style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', marginBottom: claim.admin_note ? 4 : 0 }}>🔄 Revision Required — please fix and resubmit</p>
                                            {claim.admin_note && <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{claim.admin_note}</p>}
                                        </div>
                                    )}
                                    {claim.submitted_url && (
                                        <div style={{ marginTop: 8 }}>
                                            <a href={claim.submitted_url} target="_blank" rel="noreferrer" className="task-url" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                                Submitted URL <ExternalLink size={11} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                                {(claim.status === 'claimed' || claim.status === 'revision_needed') && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: '100px' }}>
                                        <button className="btn btn-primary btn-sm" onClick={() => setSelected(claim)}
                                            style={claim.status === 'revision_needed' ? { background: 'linear-gradient(135deg,#d97706,#b45309)', border: 'none', whiteSpace: 'nowrap' } : { whiteSpace: 'nowrap' }}>
                                            <Send size={14} /> {claim.status === 'revision_needed' ? 'Resubmit' : 'Submit'}
                                        </button>
                                        {claim.status === 'claimed' && (
                                            <button className="btn btn-sm"
                                                onClick={() => setReportTarget(claim)}
                                                style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.4)', color: '#ef4444', fontSize: 12, whiteSpace: 'nowrap' }}>
                                                <AlertTriangle size={13} /> Report
                                            </button>
                                        )}
                                    </div>
                                )}
                                {claim.status === 'reported' && (
                                    <span className="badge badge-pending" style={{ padding: '6px 12px', whiteSpace: 'nowrap', fontSize: 11 }}>⏳ Pending</span>
                                )}
                                {claim.status === 'approved' && (
                                    <span className="badge badge-approved" style={{ padding: '6px 12px', fontSize: 11, whiteSpace: 'nowrap' }}>✅ Paid</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selected && (
                <SubmitModal claim={selected} onClose={() => setSelected(null)} onSubmitted={fetchMyClaims} />
            )}
            {reportTarget && (
                <ReportModal claim={reportTarget} onClose={() => setReportTarget(null)} onReported={fetchMyClaims} />
            )}
        </div>
    );
}
