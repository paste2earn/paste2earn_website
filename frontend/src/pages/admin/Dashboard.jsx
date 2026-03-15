import { useState, useEffect } from 'react';
import api from '../../api';
import { Users, CheckSquare, Clock, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/stats')
            .then(res => setStats(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="spinner" />;

    const cards = [
        { label: 'Total Users', value: stats?.total_users ?? 0, icon: <Users size={20} />, iconBg: 'bg-blue', color: 'blue' },
        { label: 'Active Tasks', value: stats?.active_tasks ?? 0, icon: <CheckSquare size={20} />, iconBg: 'bg-green', color: 'green' },
        { label: 'Pending Submissions', value: stats?.pending_submissions ?? 0, icon: <Clock size={20} />, iconBg: 'bg-yellow', color: 'yellow' },
        { label: 'Pending Approvals', value: stats?.pending_approvals ?? 0, icon: <AlertCircle size={20} />, iconBg: 'bg-red', color: 'red' },
    ];

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Admin <span>Dashboard</span></h1>
                <p className="page-subtitle">Overview of Paste2Earn platform activity.</p>
            </div>

            <div className="stats-grid">
                {cards.map(c => (
                    <div key={c.label} className="stat-card">
                        <div className={`stat-icon ${c.iconBg} ${c.color}`}>{c.icon}</div>
                        <div className="stat-label">{c.label}</div>
                        <div className={`stat-value ${c.color}`}>{c.value}</div>
                    </div>
                ))}
            </div>

            <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Quick Actions</h3>
                <div className="flex-wrap">
                    <a href="/admin/users" className="btn btn-secondary">👥 Review Users</a>
                    <a href="/admin/submissions" className="btn btn-secondary">📋 Review Submissions</a>
                    <a href="/admin/tasks/new" className="btn btn-primary">➕ Create New Task</a>
                </div>
            </div>
        </div>
    );
}
