import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import logo from '../../assests/P2E.png';

export default function Register() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        username: '', email: '', password: '', passwordConfirm: '',
        reddit_profile_url: '', discord_username: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');

        if (!form.reddit_profile_url) {
            return setError('Reddit profile URL is required.');
        }
        if (!form.discord_username) {
            return setError('Discord username is required.');
        }
        if (form.password !== form.passwordConfirm) {
            return setError('Passwords do not match.');
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/register', form);
            login(res.data.token, res.data.user);
            toast.success('Registration successful! Awaiting admin approval.');
            navigate('/pending');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src={logo} alt="Paste2Earn" style={{ maxWidth: 280, height: 'auto', marginBottom: 4 }} />
                </div>
                <h1 className="auth-title">Create Account</h1>
                <p className="auth-sub">Join and start earning from Reddit tasks</p>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input type="text" name="username" className="form-input" placeholder="your" value={form.username} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" name="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showPassword ? 'text' : 'password'} name="password" className="form-input" placeholder="Min 8 characters" value={form.password} onChange={handleChange} required minLength={8} style={{ paddingRight: 44 }} />
                            <button type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Retype Password</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showConfirm ? 'text' : 'password'} name="passwordConfirm" className="form-input" placeholder="Confirm your password" value={form.passwordConfirm} onChange={handleChange} required minLength={8} style={{ paddingRight: 44 }} />
                            <button type="button" onClick={() => setShowConfirm(p => !p)} tabIndex={-1}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}>
                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="divider" />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                        📌 Your Reddit profile will be verified by admin. They will assign you a tier based on your karma and account age.
                    </p>
                    <div style={{ background: 'rgba(79, 172, 254, 0.1)', border: '1px solid rgba(79, 172, 254, 0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
                            <strong style={{ color: '#C0C0C0' }}>🥈 Silver:</strong> 200+ karma, 3+ months → Comment tasks only
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                            <strong style={{ color: '#FFD700' }}>🥇 Gold:</strong> 1,000+ karma, 1+ year → All tasks
                        </p>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Reddit Profile URL *</label>
                        <input type="url" name="reddit_profile_url" className="form-input"
                            placeholder="https://reddit.com/user/your_username"
                            value={form.reddit_profile_url} onChange={handleChange} required />
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Admin will check your karma and account age from this profile.</p>
                    </div>

                    {/* Discord username */}
                    <div className="form-group">
                        <label className="form-label">Discord Username *</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                                color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none'
                            }}>@</span>
                            <input
                                type="text"
                                name="discord_username"
                                className="form-input"
                                placeholder="yourusername"
                                value={form.discord_username}
                                onChange={handleChange}
                                style={{ paddingLeft: 28 }}
                                required
                            />
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            Enter your exact Discord username (lowercase, no spaces). You'll verify it via DM after registering.
                        </p>
                    </div>
                    <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                        <UserPlus size={18} />
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}
