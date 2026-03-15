import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, ExternalLink, LogOut } from 'lucide-react';
import logo from '../../assests/P2E logo.jpg';

export default function PendingApproval() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backgroundImage: `
                radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.07) 0%, transparent 55%),
                radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.07) 0%, transparent 55%)
            `
        }}>
            <div style={{
                width: '100%',
                maxWidth: 480,
                textAlign: 'center'
            }}>
                {/* Logo */}
                <div style={{ marginBottom: 24 }}>
                    <img src={logo} alt="Paste2Earn" style={{ maxWidth: 240, height: 'auto' }} />
                </div>

                {/* Animated clock icon */}
                <div style={{
                    width: 88,
                    height: 88,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.15))',
                    border: '2px solid rgba(124,58,237,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 28px',
                    animation: 'pulse 2s ease-in-out infinite'
                }}>
                    <Clock size={40} color="var(--accent-light)" />
                </div>

                <style>{`
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.05); opacity: 0.85; }
                    }
                `}</style>

                <h1 style={{
                    fontSize: 26,
                    fontWeight: 800,
                    marginBottom: 10,
                    background: 'var(--accent-gradient)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    Account Under Review
                </h1>

                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
                    Hey <strong style={{ color: 'var(--text-primary)' }}>{user?.username}</strong>! Your account is pending admin approval.
                    We'll verify your Reddit profile and activate your account shortly.
                </p>

                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: '20px 24px',
                    marginBottom: 24,
                    textAlign: 'left'
                }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        What happens next
                    </p>
                    {[
                        { num: '1', text: 'Admin reviews your Reddit profile link' },
                        { num: '2', text: 'Your account gets approved (usually within 24 hrs)' },
                        { num: '3', text: 'You will receive an email when your account is approved and start earning' },
                    ].map(step => (
                        <div key={step.num} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                            <div style={{
                                width: 26, height: 26, borderRadius: '50%',
                                background: 'var(--accent-glow)',
                                border: '1px solid rgba(124,58,237,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 700, color: 'var(--accent-light)', flexShrink: 0
                            }}>{step.num}</div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, paddingTop: 3 }}>{step.text}</p>
                        </div>
                    ))}
                </div>

                {user?.reddit_profile_url && (
                    <a href={user.reddit_profile_url} target="_blank" rel="noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            fontSize: 13, color: 'var(--accent-light)',
                            textDecoration: 'none', marginBottom: 20
                        }}>
                        <ExternalLink size={14} /> View your submitted Reddit profile
                    </a>
                )}

                <div>
                    <button onClick={handleLogout}
                        style={{
                            background: 'none', border: '1px solid var(--border)',
                            borderRadius: 10, padding: '10px 20px',
                            color: 'var(--text-muted)', cursor: 'pointer',
                            fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6,
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                        <LogOut size={14} /> Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}
