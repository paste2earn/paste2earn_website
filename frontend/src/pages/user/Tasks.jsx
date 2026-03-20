import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { CheckCircle, Zap, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function extractSubredditName(task) {
    const candidates = [task?.subreddit_url, task?.target_url].filter(Boolean);

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

function extractSubredditUrl(task) {
    const candidates = [task?.subreddit_url, task?.target_url].filter(Boolean);

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

function CooldownBar() {
    const [cooldowns, setCooldowns] = useState({ post: null, comment: null, reply: null });
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        api.get('/tasks/cooldowns').then(res => setCooldowns(res.data)).catch(() => { });
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const renderTimer = (targetDateStr) => {
        if (!targetDateStr) return <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Ready</span>;

        const target = new Date(targetDateStr).getTime();
        const diff = target - now;

        if (diff <= 0) return <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Ready</span>;

        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        return (
            <span style={{ color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} /> {h}h {m}m {s}s
            </span>
        );
    };

    return (
        <div style={{
            display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
            background: 'var(--bg-card)', padding: '12px 20px', borderRadius: '12px',
            border: '1px solid var(--border)', marginBottom: 24, fontSize: 13,
            color: 'var(--text-secondary)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Posts: {renderTimer(cooldowns.post)}
            </div>
            <div style={{ color: 'var(--border)' }}>|</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Comments: {renderTimer(cooldowns.comment)}
            </div>
            <div style={{ color: 'var(--border)' }}>|</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Replies: {renderTimer(cooldowns.reply)}
            </div>
        </div>
    );
}

function ClaimModal({ task, onClose, onClaimed }) {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleClaim = async () => {
        setLoading(true);
        try {
            await api.post(`/tasks/${task.id}/claim`);
            toast.success('Task claimed!');
            onClaimed();
            onClose();
            navigate(`/my-tasks/${task.id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to claim.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">Claim Task</span>
                    <button className="modal-close" onClick={onClose}>x</button>
                </div>

                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                    After claiming, go to <strong>My Tasks</strong> to complete and submit your proof.
                </div>

                <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Task</p>
                    <p style={{ fontWeight: 600, marginBottom: 6 }}>{task.title}</p>
                    <span className={`badge badge-${task.type}`}>{task.type === 'reply' ? 'REPLY TO COMMENT' : task.type.toUpperCase()}</span>
                </div>

                <div className="alert" style={{ marginBottom: 16, background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
                    Task details (URLs, content) will be revealed after you claim.
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleClaim} disabled={loading} style={{ flex: 1 }}>
                        <Zap size={16} /> {loading ? 'Claiming...' : `Claim - $${parseFloat(task.reward).toFixed(2)}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Tasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState('all');

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await api.get('/tasks');
            setTasks(res.data);
        } catch {
            toast.error('Failed to load tasks.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTasks(); }, []);

    const filtered = tasks.filter(t => !t.claimed && (filter === 'all' || t.type === filter));

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Available <span>Tasks</span></h1>
                <p className="page-subtitle">Browse and accept tasks that match your qualifications</p>
            </div>

            <CooldownBar />

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {['all', 'comment', 'reply', 'post'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
                        {f === 'all' ? 'All Tasks' : f === 'comment' ? 'Comment' : f === 'reply' ? 'Reply to comment' : 'Post'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="spinner" />
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <CheckCircle />
                    <p>No tasks available right now. Check back soon!</p>
                </div>
            ) : (
                <div className="tasks-grid">
                    {filtered.map(task => {
                        const subredditName = extractSubredditName(task);
                        const subredditUrl = extractSubredditUrl(task);

                        return (
                            <div key={task.id} className="task-card">
                                <div className="task-card-header">
                                    <div>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{task.id}</span>
                                            <span className={`badge badge-${task.type}`}>{task.type === 'reply' ? 'REPLY TO COMMENT' : task.type.toUpperCase()}</span>
                                            {task.claimed && <span className={`badge badge-${task.claim_status}`}>{task.claim_status?.toUpperCase()}</span>}
                                        </div>
                                        <div className="task-card-title">{task.title}</div>
                                    </div>
                                    <div className="task-reward">${parseFloat(task.reward).toFixed(2)}</div>
                                </div>

                                <div className="task-card-details">
                                    {subredditName && (
                                        <p className="task-card-detail-row">
                                            <span className="task-card-detail-label">Subreddit</span>
                                            {subredditUrl ? (
                                                <a className="task-card-detail-link" href={subredditUrl} target="_blank" rel="noreferrer">
                                                    {subredditName}
                                                </a>
                                            ) : (
                                                <span className="task-card-detail-value">{subredditName}</span>
                                            )}
                                        </p>
                                    )}
                                    <p className="task-card-detail-row">
                                        <span className="task-card-detail-label">Task details</span>
                                        <span className="task-card-detail-value">Claim to reveal</span>
                                    </p>
                                </div>

                                <div style={{ marginTop: 14 }}>
                                    {task.claimed ? (
                                        <button className="btn btn-secondary btn-full" disabled>
                                            {task.claim_status === 'approved' ? 'Completed' :
                                                task.claim_status === 'submitted' ? 'Under Review' :
                                                    task.claim_status === 'rejected' ? 'Rejected' : 'Already Claimed'}
                                        </button>
                                    ) : (
                                        <button className="btn btn-primary btn-full" onClick={() => setSelected(task)}>
                                            <Zap size={16} /> Claim Task
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selected && (
                <ClaimModal task={selected} onClose={() => setSelected(null)} onClaimed={fetchTasks} />
            )}
        </div>
    );
}
