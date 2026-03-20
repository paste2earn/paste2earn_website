import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  DollarSign,
  ChevronRight,
  Globe,
  Wallet,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

export default function Landing() {
    const { user, loading } = useAuth();

    // Redirection if logged in
    if (!loading && user) {
        if (user.status === 'banned') return <Navigate to="/banned" replace />;
        if (user.role === 'admin') return <Navigate to="/admin" replace />;
        if (user.status !== 'approved') return <Navigate to="/pending" replace />;
        return <Navigate to="/tasks" replace />;
    }

    return (
        <div className="landing-container">
            {/* Header / Navbar */}
            <header className="landing-header">
                <div className="landing-nav-content">
                    <div className="auth-logo">
                        <div className="logo-text">
                            <span className="logo-blue">Paste</span>
                            <span className="logo-gold">2</span>
                            <span className="logo-purple">Earn</span>
                        </div>
                    </div>
                    <div className="nav-actions">
                        <Link to="/login" className="btn btn-secondary btn-sm nav-login-btn">Log In</Link>
                        <Link to="/register" className="btn btn-primary btn-sm nav-signup-btn">Start Earning</Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-bg-grid"></div>
                <div className="hero-glow hero-glow-1"></div>
                <div className="hero-glow hero-glow-2"></div>
                
                <div className="hero-content">
                    <div className="hero-badge animate-fade-in-up">
                        <span className="badge-pulse"></span>
                        <Globe size={14} className="blue" />
                        <span>Earn money by completing Reddit tasks</span>
                    </div>
                    
                    <h1 className="hero-title animate-fade-in-up delay-1">
                    <span className="text-gradient">Turn Your Reddit Account Into Income <br /></span></h1>
                        <span className="text-gradient">Complete simple Reddit-based tasks and earn real rewards.</span>
                    
                    
                    <p className="hero-subtitle animate-fade-in-up delay-2">
                        Turn your karma into crypto. Complete simple engagements, provide proof of work, and cash out instantly in USDT. Built for precision, built for scale.
                    </p>
                    
                    <div className="hero-cta animate-fade-in-up delay-3">
                        <Link to="/register" className="btn btn-primary btn-lg cta-primary">
                            Create Account <ArrowRight size={18} />
                        </Link>
                        <Link to="/login" className="btn btn-secondary btn-lg cta-secondary">
                            View Dashboard <ChevronRight size={18} style={{marginLeft: '-4px'}} />
                        </Link>
                    </div>
                    
                    {/* Live Stats Bar */}
                    <div className="hero-stats-bar animate-fade-in-up delay-4">
                        <div className="stat-pill">
                            <Wallet size={16} className="green" />
                            <div className="stat-data">
                                <span className="stat-val">$24,592</span>
                                <span className="stat-lbl">Paid Out</span>
                            </div>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-pill">
                            <CheckCircle2 size={16} className="blue" />
                            <div className="stat-data">
                                <span className="stat-val">12,400+</span>
                                <span className="stat-lbl">Tasks Done</span>
                            </div>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat-pill">
                            <Zap size={16} className="yellow" />
                            <div className="stat-data">
                                <span className="stat-val">Every week Friday</span>
                                <span className="stat-lbl">Payment Day</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="section-header">
                    <h2 className="section-title">Engineered for <span>Earnings</span></h2>
                    <p className="section-subtitle">We removed the friction so you can focus on stacking crypto.</p>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon-wrapper bg-blue">
                            <Zap size={24} className="blue icon-animate" />
                        </div>
                        <h3>Zero Waiting Rooms</h3>
                        <p>Our instant-claim architecture guarantees you never waste time. See a task, click it, own it. Complete it at your own pace within the cooldown.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper bg-yellow">
                            <TrendingUp size={24} className="yellow icon-animate" />
                        </div>
                        <h3>The Karma Multiplier</h3>
                        <p>Your reputation matters. Users with aged accounts and high karma automatically unlock Gold Tier, giving access to high-paying Post tasks.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon-wrapper bg-red">
                            <DollarSign size={24} className="red icon-animate" />
                        </div>
                        <h3>Borderless Payouts</h3>
                        <p>Withdraw your balance directly to any USDT wallet on Binance Smart Chain (BEP20) or Polygon or Binance Pay. Low minimums mean you ge paid faster.</p>
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section className="how-it-works">
                <div className="section-header">
                    <h2 className="section-title">The Blueprint to <span>Success</span></h2>
                    <p className="section-subtitle">Four simple steps separating you from your first withdrawal.</p>
                </div>
                
                <div className="steps-container">
                    <div className="step-card">
                        <div className="step-bg-number">01</div>
                        <h4 className="step-title">Link Profile</h4>
                        <p className="step-desc">Register with a valid Reddit profile link. Our team reviews accounts to assign your earning tier (Silver/Gold).</p>
                    </div>
                    <div className="step-card">
                        <div className="step-bg-number">02</div>
                        <h4 className="step-title">Select Task</h4>
                        <p className="step-desc">Browse available comments, replies or posts. Claim your task to lock it exclusively to you.</p>
                    </div>
                    <div className="step-card">
                        <div className="step-bg-number">03</div>
                        <h4 className="step-title">Execute & Paste</h4>
                        <p className="step-desc">Follow the instructions on Reddit, then simply paste the URL of your live comment/post back onto our dashboard.</p>
                    </div>
                    <div className="step-card">
                        <div className="step-bg-number">04</div>
                        <h4 className="step-title">Withdraw USDT</h4>
                        <p className="step-desc">Once an admin approves the link, funds hit your balance instantly. Cash out directly to your crypto wallet.</p>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="final-cta">
                <div className="cta-box">
                    <div className="cta-glow"></div>
                    <h2>Ready to scale your income?</h2>
                    <p>Stop scrolling for free. Start earning on every post.</p>
                    <Link to="/register" className="btn btn-primary btn-lg cta-primary-large">
                        Get Started For Free <ArrowRight size={20} />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-left">
                        <div className="auth-logo">
                            <div className="logo-text">
                                <span className="logo-blue">Paste</span>
                                <span className="logo-gold">2</span>
                                <span className="logo-purple">Earn</span>
                            </div>
                            <div className="logo-sub">Web3 Freelance Protocol</div>
                        </div>
                        <p className="footer-desc">The most reliable bridge between Reddit engagement and on-chain earnings.</p>
                    </div>
                    <div className="footer-right">
                        <div className="footer-column">
                            <h5>Platform</h5>
                            <Link to="/login">Dashboard</Link>
                            <Link to="/register">Sign Up</Link>
                        </div>
                        <div className="footer-column">
                            <h5>Legal</h5>
                            <Link to="#">Terms of Service</Link>
                            <Link to="#">Privacy Policy</Link>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© {new Date().getFullYear()} Paste2Earn. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
