import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { KeyRound, Eye, EyeOff, X, ShieldAlert, LogOut } from 'lucide-react';

function ChangePasswordModal({ onClose, onSuccess }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            return toast.error('New password must be at least 6 characters.');
        }
        if (newPassword !== confirmPassword) {
            return toast.error('New passwords do not match.');
        }
        if (currentPassword === newPassword) {
            return toast.error('New password must be different from current password.');
        }
        setLoading(true);
        try {
            await api.patch('/auth/password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            toast.success('Password updated successfully.');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update password.');
        } finally {
            setLoading(false);
        }
    };

    const toggleShow = () => setShowPasswords(s => !s);
    const inputType = showPasswords ? 'text' : 'password';

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 420 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Change Password</h2>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Current Password *</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={inputType}
                                className="form-input"
                                placeholder="Enter current password"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                required
                                style={{ paddingRight: 44 }}
                            />
                            <button
                                type="button"
                                onClick={toggleShow}
                                style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', color: 'var(--text-muted)',
                                    cursor: 'pointer', padding: 4
                                }}
                            >
                                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">New Password *</label>
                        <input
                            type={inputType}
                            className="form-input"
                            placeholder="Min 6 characters"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Retype New Password *</label>
                        <input
                            type={inputType}
                            className="form-input"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                        <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function BannedSubreddits() {
    const [subreddits, setSubreddits] = useState([]);
    const [newSub, setNewSub] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const fetchSubreddits = async () => {
        try {
            const res = await api.get('/auth/me/banned-subreddits');
            setSubreddits(res.data);
        } catch {
            toast.error('Failed to load banned subreddits.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSubreddits(); }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newSub.trim()) return;
        setAdding(true);
        try {
            await api.post('/auth/me/banned-subreddits', { subreddit: newSub });
            toast.success('Subreddit added');
            setNewSub('');
            fetchSubreddits();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add subreddit.');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (sub) => {
        try {
            await api.delete(`/auth/me/banned-subreddits/${sub}`);
            toast.success('Subreddit removed');
            fetchSubreddits();
        } catch {
            toast.error('Failed to remove subreddit.');
        }
    };

    return (
        <div className="card" style={{ maxWidth: 640 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldAlert size={20} color="var(--accent-light)" /> Banned Subreddits
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
                Manage subreddits you are banned from. We will avoid assigning you tasks from these subreddits.
            </p>

            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Add Banned Subreddit</h4>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Add subreddits you are banned from. This helps us avoid assigning you tasks in those subreddits.
            </p>
            <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Enter subreddit name (e.g., r/example or example)"
                    value={newSub}
                    onChange={(e) => setNewSub(e.target.value)}
                    style={{ flex: 1, marginBottom: 0 }}
                />
                <button type="submit" className="btn btn-secondary" disabled={adding || !newSub.trim()}>
                    {adding ? 'Adding...' : 'Add'}
                </button>
            </form>

            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Your Banned Subreddits</h4>
            {loading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
            ) : subreddits.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-secondary)', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
                    You haven't added any banned subreddits.
                </div>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {subreddits.map(sub => (
                        <div key={sub} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                            padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                            color: 'var(--text-primary)'
                        }}>
                            r/{sub}
                            <button
                                onClick={() => handleRemove(sub)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 2, borderRadius: 4 }}
                                title="Remove"
                                type="button"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Settings() {
    const [showChangePassword, setShowChangePassword] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Account <span>Settings</span></h1>
                <p className="page-subtitle">Manage your account preferences and security.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="card" style={{ maxWidth: 640 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <KeyRound size={20} color="var(--accent-light)" /> Security
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                        Keep your account secure by using a strong, unique password.
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowChangePassword(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <KeyRound size={18} /> Change Password
                    </button>
                </div>

                <BannedSubreddits />

                <div className="card" style={{ maxWidth: 640 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <LogOut size={20} color="var(--danger)" /> Sign Out
                    </h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                        Sign out of your account on this device.
                    </p>
                    <button
                        className="btn btn-danger"
                        onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            </div>

            {showChangePassword && (
                <ChangePasswordModal
                    onClose={() => setShowChangePassword(false)}
                    onSuccess={() => {}}
                />
            )}
        </div>
    );
}
