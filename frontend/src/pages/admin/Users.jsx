import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { ExternalLink, X } from 'lucide-react';

function ApprovalModal({ user, onClose, onApprove }) {
    const [tier, setTier] = useState('silver');

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 480 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Approve User</h2>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{user.username}</strong> ({user.email})
                    </p>
                    {user.reddit_profile_url && (
                        <a href={user.reddit_profile_url} target="_blank" rel="noreferrer" 
                            style={{ fontSize: 12, color: 'var(--blue)', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                            View Reddit Profile <ExternalLink size={11} />
                        </a>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Assign Tier *</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: 10, 
                            padding: 14, 
                            border: tier === 'silver' ? '2px solid #C0C0C0' : '1px solid var(--border)',
                            borderRadius: 10,
                            cursor: 'pointer',
                            background: tier === 'silver' ? 'rgba(192, 192, 192, 0.08)' : 'var(--bg-secondary)'
                        }}>
                            <input type="radio" name="tier" value="silver" checked={tier === 'silver'} 
                                onChange={() => setTier('silver')} />
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#C0C0C0', marginBottom: 4 }}>🥈 Silver</p>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    • 200+ karma, 3+ months<br />
                                    • Can claim comment & reply tasks only
                                </p>
                            </div>
                        </label>

                        <label style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: 10, 
                            padding: 14, 
                            border: tier === 'gold' ? '2px solid #FFD700' : '1px solid var(--border)',
                            borderRadius: 10,
                            cursor: 'pointer',
                            background: tier === 'gold' ? 'rgba(255, 215, 0, 0.08)' : 'var(--bg-secondary)'
                        }}>
                            <input type="radio" name="tier" value="gold" checked={tier === 'gold'} 
                                onChange={() => setTier('gold')} />
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#FFD700', marginBottom: 4 }}>🥇 Gold</p>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    • 1,000+ karma, 1+ year<br />
                                    • Can claim ALL tasks (comment, reply & post)
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancel</button>
                    <button type="button" className="btn btn-primary btn-full" onClick={() => onApprove(tier)}>
                        Approve as {tier === 'gold' ? 'Gold' : 'Silver'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedTier, setSelectedTier] = useState('silver');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data);
        } catch {
            toast.error('Failed to load users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const updateStatus = async (id, status, tier = 'silver') => {
        try {
            await api.patch(`/admin/users/${id}/status`, { status, tier });
            toast.success(`User ${status} successfully${status === 'approved' ? ` as ${tier === 'gold' ? 'Gold' : 'Silver'}` : ''}.`);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update user.');
        }
    };

    const updateTier = async (id, tier) => {
        try {
            await api.patch(`/admin/users/${id}/tier`, { tier });
            toast.success(`User upgraded to ${tier === 'gold' ? 'Gold' : 'Silver'} successfully.`);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update tier.');
        }
    };

    const filtered = users.filter(u => filter === 'all' || u.status === filter);

    return (
        <div>
            {selectedUser && (
                <ApprovalModal 
                    user={selectedUser} 
                    onClose={() => setSelectedUser(null)}
                    onApprove={(tier) => updateStatus(selectedUser.id, 'approved', tier)}
                />
            )}

            <div className="page-header">
                <h1 className="page-title">User <span>Management</span></h1>
                <p className="page-subtitle">Approve or reject user registrations and manage tiers.</p>
            </div>

            <div className="filter-buttons">
                {['all', 'pending', 'approved', 'rejected'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        <span style={{ opacity: 0.7, marginLeft: 4 }}>
                            ({users.filter(u => f === 'all' || u.status === f).length})
                        </span>
                    </button>
                ))}
            </div>

            {loading ? <div className="spinner" /> : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Reddit Profile</th>
                                    <th>Tier</th>
                                    <th>Wallet</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No users found.</td></tr>
                                ) : filtered.map(u => (
                                    <tr key={u.id}>
                                        <td data-label="User">
                                            <div style={{ fontWeight: 600 }}>{u.username}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                                        </td>
                                        <td data-label="Reddit Profile">
                                            {u.reddit_profile_url ? (
                                                <a href={u.reddit_profile_url} target="_blank" rel="noreferrer"
                                                    style={{ fontSize: 12, color: 'var(--blue)', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                                                    View Profile <ExternalLink size={11} />
                                                </a>
                                            ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                        </td>
                                        <td data-label="Tier">
                                            {u.tier === 'gold' ? (
                                                <span className="badge" style={{ background: 'rgba(255, 215, 0, 0.15)', color: '#FFD700' }}>
                                                    🥇 GOLD
                                                </span>
                                            ) : u.tier === 'silver' ? (
                                                <span className="badge" style={{ background: 'rgba(192, 192, 192, 0.15)', color: '#C0C0C0' }}>
                                                    🥈 SILVER
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                            )}
                                        </td>
                                        <td data-label="Wallet" style={{ color: 'var(--accent-light)', fontWeight: 700 }}>
                                            ${parseFloat(u.wallet_balance || 0).toFixed(2)}
                                        </td>
                                        <td data-label="Status">
                                            <span className={`badge badge-${u.status}`}>{u.status?.toUpperCase()}</span>
                                            {u.approved_by_name && (
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                                    by <strong style={{ color: 'var(--text-secondary)' }}>{u.approved_by_name}</strong>
                                                </div>
                                            )}
                                        </td>
                                        <td data-label="Joined" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                            {new Date(u.created_at).toLocaleDateString()}
                                        </td>
                                        <td data-label="Actions">
                                            <div className="action-buttons">
                                                {u.status === 'pending' && (
                                                    <button className="btn btn-success btn-sm" onClick={() => {
                                                        setSelectedUser(u);
                                                        setSelectedTier('silver');
                                                    }}>
                                                        Approve
                                                    </button>
                                                )}
                                                {u.status !== 'rejected' && (
                                                    <button className="btn btn-danger btn-sm" onClick={() => updateStatus(u.id, 'rejected')}>
                                                        Reject
                                                    </button>
                                                )}
                                                {u.status === 'approved' && (
                                                    <button className="btn btn-sm" 
                                                        onClick={() => updateTier(u.id, u.tier === 'gold' ? 'silver' : 'gold')}
                                                        style={{ background: 'rgba(255, 215, 0, 0.1)', color: '#FFD700', border: '1px solid rgba(255, 215, 0, 0.3)', fontSize: 11 }}>
                                                        {u.tier === 'gold' ? '🥈 Downgrade to Silver' : '🥇 Upgrade to Gold'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
