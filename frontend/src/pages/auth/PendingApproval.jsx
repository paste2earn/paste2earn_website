import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, ExternalLink, LogOut, CheckCircle, Copy, RefreshCw, MessageSquare } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import logo from '../../assests/P2E.png';

export default function PendingApproval() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [discord, setDiscord] = useState({
        discord_username: user?.discord_username || null,
        discord_verified: user?.discord_verified || false,
        code_expired: false,
        discord_verify_code: user?.discord_verify_code || null,
        discord_verify_expires: user?.discord_verify_expires || null,
        bot_id: null
    });
    const [resending, setResending] = useState(false);

    const handleLogout = () => { logout(); navigate('/login'); };

    // Poll Discord verification status every 8s until verified
    const fetchDiscordStatus = useCallback(async () => {
        try {
            const res = await api.get('/auth/discord/status');
            setDiscord(res.data);
            
            // Also optionally check if admin approved them while they wait
            const meRes = await api.get('/auth/me').catch(() => null);
            if (meRes?.data?.user?.status === 'approved') {
                window.location.href = '/tasks';
            }
        } catch { /* silent */ }
    }, []);

    // Redirect to tasks if user is already approved (e.g., after a refresh)
    useEffect(() => {
        if (user?.status === 'approved') {
            navigate('/tasks');
        }
    }, [user, navigate]);

    useEffect(() => {
        if (discord.discord_verified) return; // already done
        fetchDiscordStatus(); // immediate check
        const interval = setInterval(fetchDiscordStatus, 8000);
        return () => clearInterval(interval);
    }, [discord.discord_verified, fetchDiscordStatus]);

    const handleResend = async () => {
        setResending(true);
        try {
            const res = await api.post('/auth/discord/resend');
            toast.success('New code generated!');
            setDiscord(prev => ({
                ...prev,
                discord_verify_code: res.data.discord_verify_code,
                discord_verify_expires: res.data.discord_verify_expires,
                code_expired: false
            }));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to resend code.');
        } finally {
            setResending(false);
        }
    };

    const copyCode = () => {
        if (discord.discord_verify_code) {
            navigator.clipboard.writeText(`!verify ${discord.discord_verify_code}`);
            toast.success('Command copied!');
        }
    };

    // Minutes remaining on the code
    const minsLeft = discord.discord_verify_expires
        ? Math.max(0, Math.round((new Date(discord.discord_verify_expires) - Date.now()) / 60000))
        : 0;

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
            <div style={{ width: '100%', maxWidth: 520, textAlign: 'center' }}>
                {/* Logo */}
                <div style={{ marginBottom: 24 }}>
                    <img src={logo} alt="Paste2Earn" style={{ maxWidth: 240, height: 'auto' }} />
                </div>

                {/* Animated clock icon */}
                <div style={{
                    width: 88, height: 88, borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(124,58,237,0.15))',
                    border: '2px solid rgba(124,58,237,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                    fontSize: 26, fontWeight: 800, marginBottom: 10,
                    background: 'var(--accent-gradient)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                }}>
                    Account Under Review
                </h1>

                <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
                    Hey <strong style={{ color: 'var(--text-primary)' }}>{user?.username}</strong>! Your account is pending admin approval.
                </p>

                {/* ── Discord Verification Card ── */}
                {discord.discord_username && (
                    <div style={{
                        background: 'var(--bg-card)',
                        border: discord.discord_verified
                            ? '1px solid rgba(16,185,129,0.35)'
                            : '1px solid rgba(88,101,242,0.35)',
                        borderRadius: 16,
                        padding: '20px 24px',
                        marginBottom: 16,
                        textAlign: 'left',
                        animation: 'fadeIn 0.4s ease'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: discord.discord_verified
                                    ? 'rgba(16,185,129,0.15)'
                                    : 'rgba(88,101,242,0.15)',
                                border: `1px solid ${discord.discord_verified ? 'rgba(16,185,129,0.3)' : 'rgba(88,101,242,0.3)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <MessageSquare size={18} color={discord.discord_verified ? 'var(--success)' : '#5865F2'} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>Discord Verification</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{discord.discord_username}</div>
                            </div>
                            {discord.discord_verified
                                ? <span style={{
                                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                                    background: 'rgba(16,185,129,0.12)', color: 'var(--success)',
                                    border: '1px solid rgba(16,185,129,0.25)'
                                }}>✅ VERIFIED</span>
                                : <span style={{
                                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                                    background: 'rgba(245,158,11,0.1)', color: 'var(--warning)',
                                    border: '1px solid rgba(245,158,11,0.25)'
                                }}>⏳ PENDING</span>
                            }
                        </div>

                        {discord.discord_verified ? (
                            <div style={{
                                padding: '12px 14px', borderRadius: 10,
                                background: 'rgba(16,185,129,0.07)',
                                border: '1px solid rgba(16,185,129,0.15)',
                                fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                <CheckCircle size={16} />
                                Your Discord account is verified. Admin will review and approve shortly.
                            </div>
                        ) : (
                            <>
                                {/* Step instructions */}
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
                                    DM the <strong style={{ color: '#5865F2' }}>Paste2Earn bot</strong> on Discord with the command below to verify your account:
                                </p>

                                {/* Code box */}
                                {discord.discord_verify_code && !discord.code_expired && minsLeft > 0 ? (
                                    <>
                                        <div
                                            onClick={copyCode}
                                            title="Click to copy"
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                                                background: 'rgba(88,101,242,0.08)',
                                                border: '1px solid rgba(88,101,242,0.25)',
                                                marginBottom: 10, transition: 'background 0.15s'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.background = 'rgba(88,101,242,0.14)'}
                                            onMouseOut={e => e.currentTarget.style.background = 'rgba(88,101,242,0.08)'}
                                        >
                                            <code style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2, color: '#5865F2', fontFamily: 'monospace' }}>
                                                !verify {discord.discord_verify_code}
                                            </code>
                                            <Copy size={15} color="var(--text-muted)" />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                                                Code expires in <strong style={{ color: 'var(--warning)' }}>{minsLeft} min</strong> · Checking automatically…
                                            </p>
                                            <button onClick={fetchDiscordStatus} style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11
                                            }}>
                                                <RefreshCw size={12} /> Refresh
                                            </button>
                                        </div>

                                        {discord.bot_id && (
                                            <a 
                                                href={`https://discord.com/users/${discord.bot_id}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="btn btn-primary btn-full"
                                                style={{ marginBottom: 12, background: '#5865F2', borderColor: '#5865F2' }}
                                                onClick={() => {
                                                    // Auto-copy the code to clipboard when they click the message button!
                                                    navigator.clipboard.writeText(`!verify ${discord.discord_verify_code}`);
                                                    toast.success('Code copied to clipboard! Paste it in the chat.');
                                                }}
                                            >
                                                <MessageSquare size={16} />
                                                Message Bot on Discord
                                            </a>
                                        )}
                                    </>
                                ) : (
                                    <div style={{
                                        padding: '12px 14px', borderRadius: 10, marginBottom: 10,
                                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                                        fontSize: 12, color: 'var(--danger)'
                                    }}>
                                        ⚠️ Your verification code has <strong>expired</strong>. Generate a new one below.
                                    </div>
                                )}

                                <button
                                    onClick={handleResend}
                                    disabled={resending}
                                    style={{
                                        marginTop: 8, background: 'none',
                                        border: '1px solid rgba(88,101,242,0.3)',
                                        borderRadius: 8, padding: '7px 14px',
                                        color: '#5865F2', fontSize: 12, fontWeight: 600,
                                        cursor: resending ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        opacity: resending ? 0.6 : 1
                                    }}
                                >
                                    <RefreshCw size={13} />
                                    {resending ? 'Generating...' : 'Get New Code'}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* What happens next */}
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
                        { num: '1', text: 'Verify your Discord by DMing the bot with your code' },
                        { num: '2', text: 'Admin reviews your Reddit profile link' },
                        { num: '3', text: 'Your account gets approved (usually within 24 hrs)' },
                        { num: '4', text: 'You\'ll receive an email and can start earning!' },
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
