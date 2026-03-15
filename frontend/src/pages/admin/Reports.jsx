import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, ExternalLink, RotateCcw } from 'lucide-react';

export default function AdminReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [actionLoading, setActionLoading] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/reports');
            setReports(res.data);
        } catch {
            toast.error('Failed to load reports.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleAction = async (id, status) => {
        setActionLoading(id);
        try {
            await api.patch(`/admin/reports/${id}`, { status });
            toast.success(`Report ${status} successfully.${status === 'approved' ? ' Task returned to pool.' : ''}`);
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReleaseTask = async (taskId, reportId) => {
        if (!confirm('Release this task back to the active pool? Any claims will be removed.')) return;
        setActionLoading(reportId);
        try {
            await api.post(`/admin/tasks/${taskId}/release`);
            toast.success('Task released back to pool!');
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to release task.');
        } finally {
            setActionLoading(null);
        }
    };

    const filtered = reports.filter(r => filter === 'all' || r.status === filter);

    const counts = {
        all: reports.length,
        pending: reports.filter(r => r.status === 'pending').length,
        approved: reports.filter(r => r.status === 'approved').length,
        rejected: reports.filter(r => r.status === 'rejected').length,
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Task <span>Reports</span></h1>
                <p className="page-subtitle">Review task reports from users who encountered issues.</p>
            </div>

            <div className="alert alert-info" style={{ marginBottom: 24, fontSize: 13 }}>
                <p style={{ fontWeight: 600, marginBottom: 8 }}>📋 Report Actions:</p>
                <ul style={{ marginLeft: 20, marginBottom: 0 }}>
                    <li><strong>Approve:</strong> Removes user's claim, resets cooldown, and automatically releases task back to active pool</li>
                    <li><strong>Reject:</strong> Returns task to "claimed" status so user can continue working on it</li>
                    <li><strong>Release to Pool:</strong> Manually release any inactive task back to the active pool (removes all claims)</li>
                </ul>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: '⏳ Pending' },
                    { key: 'approved', label: '✅ Approved' },
                    { key: 'rejected', label: '❌ Rejected' },
                ].map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}>
                        {f.label}
                        <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                            {counts[f.key]}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? <div className="spinner" /> : filtered.length === 0 ? (
                <div className="empty-state"><p>No reports found.</p></div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {filtered.map(report => (
                        <div key={report.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{report.task_id}</span>
                                        <span className={`badge badge-${report.task_type}`}>
                                            {report.task_type === 'reply' ? 'REPLY TO COMMENT' : report.task_type?.toUpperCase()}
                                        </span>
                                        <span className={`badge ${report.status === 'approved' ? 'badge-approved' : report.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                                            {report.status.toUpperCase()}
                                        </span>
                                    </div>

                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{report.task_title}</h3>

                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                        Reported by <strong style={{ color: 'var(--text-primary)' }}>{report.username}</strong>
                                        <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{report.email}</span>
                                    </div>

                                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px', marginTop: 10 }}>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>⚠️ Reason: {report.reason}</p>
                                        {report.details && <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{report.details}</p>}
                                    </div>

                                    {report.task_status && (
                                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                                            Task Status: <span className={`badge badge-${report.task_status}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                                                {report.task_status.toUpperCase()}
                                            </span>
                                        </div>
                                    )}

                                    {report.target_url && (
                                        <div style={{ marginTop: 8 }}>
                                            <a href={report.target_url} target="_blank" rel="noreferrer" className="task-url" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                                Task URL <ExternalLink size={11} />
                                            </a>
                                        </div>
                                    )}

                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                        Reported on {new Date(report.created_at).toLocaleDateString()}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    {report.status === 'pending' && (
                                        <>
                                            <button className="btn btn-sm"
                                                onClick={() => handleAction(report.id, 'rejected')}
                                                disabled={actionLoading === report.id}
                                                style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.4)', color: '#ef4444' }}>
                                                <XCircle size={14} /> Reject
                                            </button>
                                            <button className="btn btn-primary btn-sm"
                                                onClick={() => handleAction(report.id, 'approved')}
                                                disabled={actionLoading === report.id}
                                                style={{ background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none' }}>
                                                <CheckCircle2 size={14} /> Approve
                                            </button>
                                        </>
                                    )}
                                    {report.status !== 'pending' && report.task_status === 'inactive' && (
                                        <button className="btn btn-sm btn-secondary"
                                            onClick={() => handleReleaseTask(report.task_id, report.id)}
                                            disabled={actionLoading === report.id}
                                            style={{ border: '1px solid rgba(59,130,246,0.4)', color: '#3b82f6' }}>
                                            <RotateCcw size={14} /> Release to Pool
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
