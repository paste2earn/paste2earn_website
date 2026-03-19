import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { ShieldAlert, LogOut, MessageSquare } from 'lucide-react';

export default function Banned() {
    const { user, logout } = useAuth();

    if (!user || user.status !== 'banned') {
        return <Navigate to="/" replace />;
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'var(--bg-primary)'
        }}>
            <div className="card" style={{ 
                width: '100%', 
                maxWidth: '460px', 
                textAlign: 'center', 
                padding: '40px 30px',
                border: '1px solid var(--danger)',
                boxShadow: '0 0 40px rgba(220, 38, 38, 0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%' }}>
                        <ShieldAlert size={56} style={{ color: 'var(--danger)' }} />
                    </div>
                </div>

                <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                    Access Restricted
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '15px', lineHeight: 1.5 }}>
                    Your account has been permanently blocked due to a violation of our platform guidelines. 
                    You can no longer participate in tasks, withdraw funds, or access the dashboard.
                </p>

                <div style={{ 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '12px', 
                    padding: '16px', 
                    marginBottom: '32px', 
                    border: '1px solid var(--border)',
                    textAlign: 'left'
                }}>
                    <p style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>What can I do?</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MessageSquare size={16} style={{ color: 'var(--blue)' }} />
                            Contact an admin on Discord to appeal the decision.
                        </li>
                    </ul>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <a 
                        href="https://discord.gg/your-invite-link" /* TODO: replace with real discord link */
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-full"
                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}
                    >
                        Join Discord for Support
                    </a>
                    <button 
                        onClick={logout}
                        className="btn btn-secondary btn-full"
                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
