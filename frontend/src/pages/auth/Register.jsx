import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import logo from '../../assests/P2E.png';

export default function Register() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        username: '', email: '', password: '', passwordConfirm: '',
        reddit_profile_url: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');

        if (!form.reddit_profile_url) {
            return setError('Reddit profile URL is required.');
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
                        <input type="password" name="password" className="form-input" placeholder="Min 8 characters" value={form.password} onChange={handleChange} required minLength={8} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Retype Password</label>
                        <input type="password" name="passwordConfirm" className="form-input" placeholder="Confirm your password" value={form.passwordConfirm} onChange={handleChange} required minLength={8} />
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
