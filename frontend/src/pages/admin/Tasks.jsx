import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { ToggleLeft, ToggleRight, ExternalLink, RotateCcw } from 'lucide-react';

export default function AdminTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/tasks');
            setTasks(res.data);
        } catch {
            toast.error('Failed to load tasks.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTasks(); }, []);

    const toggleStatus = async (task) => {
        const newStatus = task.status === 'active' ? 'inactive' : 'active';
        try {
            await api.patch(`/admin/tasks/${task.id}/status`, { status: newStatus });
            toast.success(`Task ${newStatus === 'active' ? 'activated' : 'deactivated'}!`);
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update task.');
        }
    };

    const releaseToPool = async (task) => {
        if (!confirm('Release this task back to the active pool? This will remove any claims and make it available again.')) return;
        try {
            await api.post(`/admin/tasks/${task.id}/release`);
            toast.success('Task released back to pool!');
            fetchTasks();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to release task.');
        }
    };

    const filtered = tasks.filter(t => filter === 'all' || t.status === filter);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Active <span>Tasks</span></h1>
                <p className="page-subtitle">View and manage all tasks — toggle active/inactive status.</p>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {['all', 'active', 'inactive'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
                        {f === 'all' ? 'All' : f === 'active' ? '🟢 Active' : '⚫ Inactive'}
                        <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                            {f === 'all' ? tasks.length : tasks.filter(t => t.status === f).length}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? <div className="spinner" /> : filtered.length === 0 ? (
                <div className="empty-state">
                    <p>No tasks found.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {filtered.map(task => (
                        <div key={task.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{task.id}</span>
                                    <span className={`badge badge-${task.type}`}>{task.type === 'reply' ? 'REPLY TO COMMENT' : task.type?.toUpperCase()}</span>
                                    <span className={`badge badge-${task.status}`}>{task.status?.toUpperCase()}</span>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-light)' }}>
                                        ${parseFloat(task.reward).toFixed(2)}
                                    </span>
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{task.title}</div>
                                {(task.type === 'comment' || task.type === 'reply') && task.target_url && (
                                    <a href={task.target_url} target="_blank" rel="noreferrer" className="task-url" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                        {task.target_url.split('?')[0]} <ExternalLink size={11} />
                                    </a>
                                )}
                                {(task.type === 'comment' || task.type === 'reply') && task.comment_text && (
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                                        Comment: <span style={{ color: 'var(--text-secondary)' }}>"{task.comment_text}"</span>
                                    </p>
                                )}
                                {task.type === 'post' && task.subreddit_url && (
                                    <a href={task.subreddit_url} target="_blank" rel="noreferrer" className="task-url" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                        {task.subreddit_url} <ExternalLink size={11} />
                                    </a>
                                )}
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                                    Created {new Date(task.created_at).toLocaleDateString()}
                                    {task.created_by_name && (
                                        <span style={{ marginLeft: 6 }}>· by <strong style={{ color: 'var(--text-secondary)' }}>{task.created_by_name}</strong></span>
                                    )}
                                </p>

                                {/* Show explicit task completion status if claimed */}
                                {task.claim_status && (
                                    <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status:</span>
                                        {task.claim_status === 'claimed' && <span className="badge badge-inactive">WORKING</span>}
                                        {task.claim_status === 'submitted' && <span className="badge badge-submitted">PENDING REVIEW</span>}
                                        {task.claim_status === 'approved' && <span className="badge badge-approved">COMPLETED</span>}
                                        {task.claim_status === 'rejected' && <span className="badge badge-rejected">FAILED</span>}
                                        {task.claim_status === 'revision_needed' && <span className="badge badge-pending">REVISION</span>}
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            by <strong>{task.claimed_by_username}</strong>
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                {(task.claim_status || task.status === 'inactive') && (
                                    <button
                                        onClick={() => releaseToPool(task)}
                                        className="btn btn-sm btn-secondary"
                                        title="Release task back to pool"
                                        style={{ border: '1px solid rgba(59,130,246,0.4)', color: '#3b82f6' }}
                                    >
                                        <RotateCcw size={16} /> Release
                                    </button>
                                )}
                                <button
                                    onClick={() => toggleStatus(task)}
                                    className={`btn btn-sm ${task.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                                >
                                    {task.status === 'active'
                                        ? <><ToggleRight size={16} /> Deactivate</>
                                        : <><ToggleLeft size={16} /> Activate</>}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
