import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, CheckSquare, ListTodo, Wallet, Info, Settings,
    Users, PlusCircle, ClipboardList, LogOut, Menu, X, List, Sun, Moon, Eye, EyeOff, Banknote, AlertTriangle
} from 'lucide-react';
import logoIcon from '../assests/P2E logo.png';

export default function AppLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [showUsername, setShowUsername] = useState(false);

    const maskUsername = (name) => {
        if (!name) return '';
        if (name.includes('@')) {
            const [local, domain] = name.split('@');
            if (local.length > 2) {
                return `${local[0]}****@${domain}`;
            }
        }
        if (name.length > 4) {
            return `${name.substring(0, 2)}****${name.substring(name.length - 2)}`;
        }
        return name;
    };

    // Apply theme to <html> element
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isAdmin = user?.role === 'admin';
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div className="layout">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="sidebar-overlay" onClick={closeSidebar} />
            )}

            {/* Mobile top bar */}
            <div className="mobile-topbar">
                <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>
                    {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={logoIcon} alt="Paste2Earn" style={{ width: 32, height: 32, borderRadius: 6 }} />
                    <div className="logo-text" style={{ fontSize: 18 }}>
                        <span className="logo-blue">Paste</span><span className="logo-gold">2</span><span className="logo-purple">Earn</span>
                    </div>
                </div>
                <button className="hamburger" onClick={toggleTheme} title="Toggle theme">
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src={logoIcon} alt="Paste2Earn" style={{ width: 42, height: 42, borderRadius: 8 }} />
                        <div>
                            <div className="logo-text">
                                <span className="logo-blue">Paste</span><span className="logo-gold">2</span><span className="logo-purple">Earn</span>
                            </div>
                            <div className="logo-sub">Reddit Task Platform</div>
                        </div>
                    </div>
                    {/* Theme toggle in desktop sidebar */}
                    <button
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            padding: '6px 8px',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 12,
                            transition: 'all 0.2s'
                        }}
                    >
                        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {isAdmin ? (
                        <>
                            <span className="nav-section-label">Admin</span>
                            <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <LayoutDashboard size={18} /> Dashboard
                            </NavLink>
                            <NavLink to="/admin/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <Users size={18} /> Users
                            </NavLink>
                            <NavLink to="/admin/tasks" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <List size={18} /> Tasks
                            </NavLink>
                            <NavLink to="/admin/tasks/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <PlusCircle size={18} /> Create Task
                            </NavLink>
                            <NavLink to="/admin/submissions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <ClipboardList size={18} /> Submissions
                            </NavLink>
                            <NavLink to="/admin/withdrawals" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <Banknote size={18} /> Withdrawals
                            </NavLink>
                            <NavLink to="/admin/reports" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <AlertTriangle size={18} /> Reports
                            </NavLink>
                            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <Settings size={18} /> Settings
                            </NavLink>
                        </>
                    ) : (
                        <>
                            <span className="nav-section-label">Menu</span>
                            <NavLink to="/tasks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <CheckSquare size={18} /> Tasks
                            </NavLink>
                            <NavLink to="/my-tasks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <ListTodo size={18} /> My Tasks
                            </NavLink>
                            <NavLink to="/wallet" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <Wallet size={18} /> Wallet
                            </NavLink>
                            <NavLink to="/info" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <Info size={18} /> Info
                            </NavLink>
                            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
                                <Settings size={18} /> Settings
                            </NavLink>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="user-name" style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 180 }}>
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={user?.username}>
                                    {showUsername ? user?.username : maskUsername(user?.username)}
                                </span>
                                <button type="button" onClick={() => setShowUsername(!showUsername)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
                                    {showUsername ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <div className="user-role" style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {user?.role === 'admin' ? (
                                    <span style={{ 
                                        padding: '4px 10px', 
                                        background: 'var(--bg-card)', 
                                        color: 'var(--blue)', 
                                        borderRadius: 6, 
                                        fontSize: 12, 
                                        fontWeight: 600, 
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}>👑 ADMIN</span>
                                ) : (
                                    <>
                                        {user?.tier === 'gold' && (
                                            <span style={{ 
                                                padding: '4px 8px', 
                                                background: 'var(--bg-card)', 
                                                color: 'var(--gold)', 
                                                borderRadius: 6, 
                                                fontSize: 12, 
                                                fontWeight: 600, 
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>🥇 GOLD</span>
                                        )}
                                        {user?.tier === 'silver' && (
                                            <span style={{ 
                                                padding: '4px 8px', 
                                                background: 'var(--bg-card)', 
                                                color: 'var(--text-secondary)', 
                                                borderRadius: 6, 
                                                fontSize: 12, 
                                                fontWeight: 600, 
                                                border: '1px solid var(--border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>🥈 SILVER</span>
                                        )}
                                        <span style={{ 
                                            padding: '4px 8px', 
                                            background: 'var(--bg-card)', 
                                            color: 'var(--success)', 
                                            borderRadius: 6, 
                                            fontSize: 13, 
                                            fontWeight: 700, 
                                            border: '1px solid var(--border)',
                                            letterSpacing: '0.5px'
                                        }}>
                                            ${parseFloat(user?.wallet_balance || 0).toFixed(2)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
