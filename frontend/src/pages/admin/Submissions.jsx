import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { ExternalLink, CheckCircle, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';

const cleanUrl = (url) => { try { return url?.split('?')[0] || url; } catch { return url; } };
const isUrl = (str) => str && (str.startsWith('http://') || str.startsWith('https://'));

function ReviewModal({ sub, onClose, onDone }) {
    const [note, setNote] = useState('');
    const [rejectionReason, setRejectionReason] = useState('Automod Removed');
    const [view, setView] = useState('main'); // 'main' | 'revision' | 'reject'
    const [loading, setLoading] = useState(false);

    const handleAction = async (status, extra = {}) => {
        if (status === 'revision_needed' && !note.trim()) {
            return toast.error('Please add a note explaining what needs to be fixed.');
        }
        setLoading(true);
        try {
            await api.patch(`/admin/submissions/${sub.id}`, {
                status,
                admin_note: note || null,
                rejection_reason: extra.rejection_reason || null
            });
            toast.success(
                status === 'approved' ? 'Submission approved ✅' :
                    status === 'revision_needed' ? 'Sent back for revision 🔄' :
                        `Rejected: ${extra.rejection_reason || 'n/a'}`
            );
            onDone();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed.');
        } finally {
            setLoading(false);
        }
    };

    const isPending = sub.status === 'submitted';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">Review Submission</span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{sub.task_id}</span>
                        <span className={`badge badge-${sub.task_type}`}>{sub.task_type === 'reply' ? 'REPLY TO COMMENT' : sub.task_type?.toUpperCase()}</span>
                        <span className={`badge badge-${sub.status === 'submitted' ? 'submitted' : sub.status === 'approved' ? 'approved' : 'rejected'}`}>
                            {sub.status?.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-light)' }}>
                            ${parseFloat(sub.reward).toFixed(2)}
                        </span>
                    </div>
                    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{sub.task_title}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        by <strong style={{ color: 'var(--text-primary)' }}>{sub.username}</strong>
                    </p>
                    {sub.admin_note && (
                        <div className="alert alert-info" style={{ marginTop: 10, marginBottom: 0, fontSize: 12 }}>
                            Admin note: {sub.admin_note}
                        </div>
                    )}
                    {sub.reviewed_by_name && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                            {sub.status === 'approved' ? '✅' : '❌'} Reviewed by{' '}
                            <strong style={{ color: 'var(--text-secondary)' }}>{sub.reviewed_by_name}</strong>
                        </p>
                    )}
                </div>

                <div className="divider" />

                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Submitted URL</p>
                <a href={sub.submitted_url} target="_blank" rel="noreferrer" className="task-url"
                    style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 12, wordBreak: 'break-all' }}>
                    {cleanUrl(sub.submitted_url)} <ExternalLink size={11} style={{ flexShrink: 0 }} />
                </a>

                {(sub.task_type === 'comment' || sub.task_type === 'reply') && (
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>3 Random Comments Pasted</p>
                        {['comment1', 'comment2', 'comment3'].map((k, i) => sub[k] && (
                            <div key={k} className="copy-box" style={{ marginBottom: 8, padding: '10px 14px' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', marginBottom: 4 }}>#{i + 1}</span>
                                {isUrl(sub[k]) ? (
                                    <a href={sub[k]} target="_blank" rel="noreferrer"
                                        style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, wordBreak: 'break-all' }}>
                                        {cleanUrl(sub[k])} <ExternalLink size={11} style={{ flexShrink: 0 }} />
                                    </a>
                                ) : (
                                    <span style={{ fontSize: 13 }}>{sub[k]}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {isPending && (
                    <>
                        {/* ─── MAIN: 3 action buttons ─── */}
                        {view === 'main' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                                <button className="btn btn-success btn-full" onClick={() => handleAction('approved')} disabled={loading}>
                                    <CheckCircle size={16} /> Approve · ${parseFloat(sub.reward).toFixed(2)}
                                </button>
                                <button className="btn btn-secondary btn-full" onClick={() => setView('revision')} disabled={loading}
                                    style={{ borderColor: 'rgba(245,158,11,0.4)', color: '#F59E0B' }}>
                                    <RotateCcw size={16} /> Request Revision
                                </button>
                                <button className="btn btn-danger btn-full" onClick={() => setView('reject')} disabled={loading}>
                                    <XCircle size={16} /> Reject
                                </button>
                            </div>
                        )}

                        {/* ─── REVISION: note required ─── */}
                        {view === 'revision' && (
                            <div style={{ marginTop: 14 }}>
                                <div className="alert alert-info" style={{ marginBottom: 12, fontSize: 12 }}>
                                    🔄 Tell the user exactly what to fix. They will be able to resubmit.
                                </div>
                                <div className="form-group">
                                    <label className="form-label">What needs to be fixed? *</label>
                                    <input type="text" className="form-input" autoFocus
                                        placeholder="e.g. Spelling mistake in paragraph 2, or wrong subreddit"
                                        value={note} onChange={e => setNote(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary" onClick={() => { setView('main'); setNote(''); }} style={{ flex: 1 }}>← Back</button>
                                    <button className="btn btn-primary" onClick={() => handleAction('revision_needed')} disabled={loading} style={{ flex: 2, background: 'linear-gradient(135deg, #d97706, #b45309)', border: 'none' }}>
                                        <RotateCcw size={15} /> {loading ? 'Sending...' : 'Send for Revision'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ─── REJECT: reason + optional note ─── */}
                        {view === 'reject' && (
                            <div style={{ marginTop: 14 }}>
                                <div className="form-group">
                                    <label className="form-label">Rejection Reason *</label>
                                    <select className="form-select" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}>
                                        <option>Automod Removed</option>
                                        <option>Policy Violation</option>
                                        <option>Duplicate Submission</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Admin Note (optional)</label>
                                    <input type="text" className="form-input" placeholder="Extra context for the user..."
                                        value={note} onChange={e => setNote(e.target.value)} />
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn btn-secondary" onClick={() => { setView('main'); setNote(''); }} style={{ flex: 1 }}>← Back</button>
                                    <button className="btn btn-danger" onClick={() => handleAction('rejected', { rejection_reason: rejectionReason })} disabled={loading} style={{ flex: 2 }}>
                                        <XCircle size={15} /> {loading ? 'Rejecting...' : `Reject — ${rejectionReason}`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {!isPending && (
                    <div className="alert alert-info" style={{ marginTop: 12 }}>
                        This submission was already <strong>{sub.status}</strong>.
                    </div>
                )}
            </div>
        </div>
    );
}

const STATUS_FILTERS = ['all', 'submitted', 'revision_needed', 'approved', 'rejected'];
const STATUS_LABELS = { all: 'All', submitted: '⏳ Pending', revision_needed: '🔄 Revision', approved: '✅ Approved', rejected: '❌ Rejected' };

export default function AdminSubmissions() {
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState('all');

    const fetchSubs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/submissions/all');
            setSubs(res.data);
        } catch {
            toast.error('Failed to load submissions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSubs(); }, []);

    const filtered = subs.filter(s => filter === 'all' || s.status === filter);

    const statusBadge = (status) => {
        if (status === 'submitted') return <span className="badge badge-submitted">PENDING</span>;
        if (status === 'approved') return <span className="badge badge-approved">APPROVED</span>;
        if (status === 'rejected') return <span className="badge badge-rejected">REJECTED</span>;
        if (status === 'revision_needed') return <span className="badge badge-pending" style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>REVISION</span>;
        return null;
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">All <span>Submissions</span></h1>
                <p className="page-subtitle">View and review all task submissions — pending, approved, and rejected.</p>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {STATUS_FILTERS.map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
                        {STATUS_LABELS[f]}
                        {f !== 'all' && (
                            <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                                {subs.filter(s => s.status === f).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? <div className="spinner" /> : filtered.length === 0 ? (
                <div className="empty-state">
                    <CheckCircle />
                    <p>{filter === 'all' ? 'No submissions yet.' : `No ${STATUS_LABELS[filter]} submissions.`}</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Task ID</th>
                                    <th>User</th>
                                    <th>Task</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Reward</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: 12 }}>#{s.task_id}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{s.username}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.email}</div>
                                        </td>
                                        <td style={{ maxWidth: 180 }}>
                                            <div style={{ fontWeight: 500, fontSize: 13 }}>{s.task_title}</div>
                                            {s.submitted_url && (
                                                <a href={s.submitted_url} target="_blank" rel="noreferrer"
                                                    style={{ fontSize: 11, color: 'var(--blue)', display: 'inline-flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
                                                    View Proof <ExternalLink size={10} />
                                                </a>
                                            )}
                                        </td>
                                        <td><span className={`badge badge-${s.task_type}`}>{s.task_type === 'reply' ? 'REPLY TO COMMENT' : s.task_type?.toUpperCase()}</span></td>
                                        <td>{statusBadge(s.status)}</td>
                                        <td style={{ color: 'var(--accent-light)', fontWeight: 700 }}>${parseFloat(s.reward).toFixed(2)}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(s.updated_at).toLocaleDateString()}</td>
                                        <td>
                                            <button className="btn btn-primary btn-sm" onClick={() => setSelected(s)}>
                                                {s.status === 'submitted' ? 'Review' : 'View'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selected && (
                <ReviewModal sub={selected} onClose={() => setSelected(null)} onDone={fetchSubs} />
            )}
        </div>
    );
}
