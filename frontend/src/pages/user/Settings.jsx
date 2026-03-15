import { useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { KeyRound, Eye, EyeOff, X } from 'lucide-react';

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

export default function Settings() {
    const [showChangePassword, setShowChangePassword] = useState(false);

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Account <span>Settings</span></h1>
                <p className="page-subtitle">Manage your account preferences and security.</p>
            </div>

            <div className="card" style={{ maxWidth: 520 }}>
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

            {showChangePassword && (
                <ChangePasswordModal
                    onClose={() => setShowChangePassword(false)}
                    onSuccess={() => {}}
                />
            )}
        </div>
    );
}
