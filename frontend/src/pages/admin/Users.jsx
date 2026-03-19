import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { ExternalLink, X } from 'lucide-react';
import Pagination, { paginate } from '../../components/Pagination';

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
                    {user.discord_username && (
                        <div style={{ marginTop: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: '#5865F2', fontWeight: 600 }}>@{user.discord_username}</span>
                            {user.discord_verified
                                ? <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' }}>✅ Verified</span>
                                : <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.2)' }}>⏳ Unverified</span>
                            }
                        </div>
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
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/users?search=${searchTerm}`);
            setUsers(res.data);
        } catch {
            toast.error('Failed to load users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchUsers();
        }, searchTerm ? 500 : 0);
        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);

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

    const updateRole = async (id, role) => {
        if (!window.confirm(`Are you sure you want to make this user ${role === 'admin' ? 'an Admin' : 'a regular User'}?`)) return;
        try {
            await api.patch(`/admin/users/${id}/role`, { role });
            toast.success(role === 'admin' ? '👑 User promoted to Admin!' : 'User demoted to regular User.');
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update role.');
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filter]);

    const filtered = users.filter(u => filter === 'all' || u.status === filter);
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginatedUsers = paginate(filtered, currentPage, ITEMS_PER_PAGE);

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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['all', 'pending', 'approved', 'rejected', 'banned'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            <span style={{ opacity: 0.7, marginLeft: 4 }}>
                                ({users.filter(u => f === 'all' || u.status === f).length})
                            </span>
                        </button>
                    ))}
                </div>

                <div className="form-group" style={{ marginBottom: 0, minWidth: 260 }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by username, email, ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '8px 14px', fontSize: 13 }}
                    />
                </div>
            </div>

            {loading ? <div className="spinner" /> : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Reddit Profile</th>
                                    <th>Discord</th>
                                    <th>Tier</th>
                                    <th>Wallet</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No users found.</td></tr>
                                ) : paginatedUsers.map(u => (
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
                                        <td data-label="Discord">
                                            {u.discord_username ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <span style={{ fontSize: 12, color: '#5865F2', fontWeight: 600 }}>@{u.discord_username}</span>
                                                    {u.discord_verified
                                                        ? <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', alignSelf: 'flex-start' }}>✅ Verified</span>
                                                        : <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.2)', alignSelf: 'flex-start' }}>⏳ Unverified</span>
                                                    }
                                                </div>
                                            ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                        </td>
                                        <td data-label="Tier">
                                            {u.tier === 'gold' ? (
                                                <span className="badge" style={{ background: 'var(--bg-card)', color: 'var(--gold)', border: '1px solid var(--border)' }}>
                                                    🥇 GOLD
                                                </span>
                                            ) : u.tier === 'silver' ? (
                                                <span className="badge" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                                                    🥈 SILVER
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                            )}
                                        </td>
                                        <td data-label="Wallet" style={{ color: 'var(--success)', fontWeight: 700 }}>
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
                                                {u.role === 'user' && u.status === 'pending' && (
                                                    <button className="btn btn-success btn-sm" onClick={() => {
                                                        setSelectedUser(u);
                                                        setSelectedTier('silver');
                                                    }}>
                                                        Approve
                                                    </button>
                                                )}
                                                {u.role === 'user' && u.status === 'pending' && (
                                                    <button className="btn btn-danger btn-sm" onClick={() => updateStatus(u.id, 'rejected')}>
                                                        Reject
                                                    </button>
                                                )}
                                                {u.role === 'user' && u.status === 'approved' && (
                                                    <button className="btn btn-danger btn-sm" 
                                                        onClick={() => {
                                                            if (confirm(`Ban ${u.username}? This will block their wallet and task access.`)) {
                                                                updateStatus(u.id, 'banned');
                                                            }
                                                        }}
                                                        style={{ background: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b' }}>
                                                        🚫 Ban User
                                                    </button>
                                                )}
                                                {u.role === 'user' && (u.status === 'rejected' || u.status === 'banned') && (
                                                    <button className="btn btn-success btn-sm" onClick={() => {
                                                        setSelectedUser(u);
                                                        setSelectedTier(u.tier || 'silver');
                                                    }}>
                                                        {u.status === 'banned' ? '✅ Unban (Approve)' : 'Approve'}
                                                    </button>
                                                )}
                                                {u.role === 'user' && u.status === 'approved' && (
                                                    <button className="btn btn-sm" 
                                                        onClick={() => updateTier(u.id, u.tier === 'gold' ? 'silver' : 'gold')}
                                                        style={{ background: 'var(--bg-card)', color: 'var(--gold)', border: '1px solid var(--border)', fontSize: 11 }}>
                                                        {u.tier === 'gold' ? '🥈 Downgrade to Silver' : '🥇 Upgrade to Gold'}
                                                    </button>
                                                )}
                                                {u.role === 'user' && u.status === 'approved' && (
                                                    <button className="btn btn-sm"
                                                        onClick={() => updateRole(u.id, 'admin')}
                                                        style={{ background: 'var(--bg-card)', color: 'var(--accent-end)', border: '1px solid var(--border)', fontSize: 11 }}>
                                                        👑 Make Admin
                                                    </button>
                                                )}
                                                {u.role === 'admin' && (
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>👑 Admin</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            )}
        </div>
    );
}
