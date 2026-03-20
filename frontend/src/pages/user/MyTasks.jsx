import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { ExternalLink, Send, AlertTriangle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const REPORT_REASONS = [
    'Subreddit is banned or private',
    'Content violates subreddit rules',
    'Post URL is broken or invalid',
    'Requirements are impossible to meet',
    'Thread was archived or locked',
    'Other (please specify)'
];

function extractSubredditName(claim) {
    const candidates = [claim?.subreddit_url, claim?.target_url].filter(Boolean);

    for (const candidate of candidates) {
        try {
            const match = new URL(candidate).pathname.match(/\/r\/([^/]+)/i);
            if (match) return `r/${match[1]}`;
        } catch {
            const match = String(candidate).match(/\/r\/([^/\s]+)/i);
            if (match) return `r/${match[1]}`;
        }
    }

    return null;
}

function extractSubredditUrl(claim) {
    const candidates = [claim?.subreddit_url, claim?.target_url].filter(Boolean);

    for (const candidate of candidates) {
        try {
            const url = new URL(candidate);
            const match = url.pathname.match(/\/r\/([^/]+)/i);
            if (match) {
                return `${url.origin}/r/${match[1]}/`;
            }
        } catch {
            const match = String(candidate).match(/https?:\/\/[^/\s]+\/r\/([^/\s]+)/i);
            if (match) {
                const originMatch = String(candidate).match(/^(https?:\/\/[^/\s]+)/i);
                if (originMatch) return `${originMatch[1]}/r/${match[1]}/`;
            }
        }
    }

    return null;
}

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
                    <span className="modal-title">Report Task #{claim.task_id}</span>
                    <button className="modal-close" onClick={onClose}>x</button>
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

const STATUS_FILTERS = ['claimed', 'submitted', 'revision_needed', 'reported', 'approved', 'rejected'];
const STATUS_LABELS = { claimed: 'To Do', submitted: 'Under Review', revision_needed: 'Waiting', reported: 'Reported', approved: 'Completed', rejected: 'Failed' };

export default function MyTasks() {
    const navigate = useNavigate();
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
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
                    {filtered.map(claim => {
                        const isClaimed = claim.status === 'claimed';
                        const expiresAt = new Date(new Date(claim.created_at).getTime() + 60 * 60 * 1000);
                        const isExpired = Date.now() > expiresAt;
                        const subredditName = extractSubredditName(claim);
                        const subredditUrl = extractSubredditUrl(claim);

                        return (
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
                                        {subredditName && (
                                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                                Subreddit:{' '}
                                                {subredditUrl ? (
                                                    <a className="task-card-detail-link" href={subredditUrl} target="_blank" rel="noreferrer">
                                                        {subredditName}
                                                    </a>
                                                ) : (
                                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{subredditName}</span>
                                                )}
                                            </p>
                                        )}
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                                            <span>Claimed on {new Date(claim.created_at).toLocaleDateString()} {new Date(claim.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {isClaimed && (
                                                <span style={{ color: isExpired ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                                    | {isExpired ? 'Expired' : `Expires at ${expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                </span>
                                            )}
                                        </p>
                                        {claim.submitted_at && (
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                Submitted on {new Date(claim.submitted_at).toLocaleDateString()} at {new Date(claim.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        )}
                                        {claim.status === 'submitted' && (
                                            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: 'var(--blue)', borderRadius: 8, padding: '10px 14px', marginTop: 10, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                <Clock size={14} /> Waiting for Admin Approval...
                                            </div>
                                        )}
                                        {claim.admin_note && claim.status === 'rejected' && (
                                            <div className="alert alert-error" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>
                                                <strong>Rejected:</strong> {claim.admin_note}
                                            </div>
                                        )}
                                        {claim.status === 'revision_needed' && (
                                            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 10, padding: '10px 14px', marginTop: 10 }}>
                                                <p style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', marginBottom: claim.admin_note ? 4 : 0 }}>Revision required, please fix and resubmit</p>
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
                                            {isClaimed && isExpired ? (
                                                <button className="btn btn-secondary btn-sm" disabled style={{ whiteSpace: 'nowrap' }}>
                                                    Expired
                                                </button>
                                            ) : (
                                                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/my-tasks/${claim.task_id}`)}
                                                    style={claim.status === 'revision_needed' ? { background: 'linear-gradient(135deg,#d97706,#b45309)', border: 'none', whiteSpace: 'nowrap' } : { whiteSpace: 'nowrap' }}>
                                                    <Send size={14} /> {claim.status === 'revision_needed' ? 'Resubmit' : 'Complete Task'}
                                                </button>
                                            )}
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
                                        <span className="badge badge-pending" style={{ padding: '6px 12px', whiteSpace: 'nowrap', fontSize: 11 }}>Pending</span>
                                    )}
                                    {claim.status === 'approved' && (
                                        <span className="badge badge-approved" style={{ padding: '6px 12px', fontSize: 11, whiteSpace: 'nowrap' }}>Paid</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {reportTarget && (
                <ReportModal claim={reportTarget} onClose={() => setReportTarget(null)} onReported={fetchMyClaims} />
            )}
        </div>
    );
}
