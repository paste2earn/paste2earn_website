import { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { DollarSign, TrendingUp, TrendingDown, Clock, X, Banknote } from 'lucide-react';

function WithdrawModal({ available, onClose, onSuccess }) {
    const [amount, setAmount] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [walletType, setWalletType] = useState('usdt_bep20');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) return toast.error('Please enter a valid amount.');
        if (parseFloat(amount) > parseFloat(available)) return toast.error('Amount exceeds available balance.');
        if (!walletAddress.trim()) return toast.error('Wallet address or Binance ID is required.');
        setLoading(true);
        try {
            await api.post('/wallet/withdraw', { 
                amount: parseFloat(amount), 
                wallet_address: walletAddress.trim(),
                wallet_type: walletType
            });
            toast.success('Withdrawal request submitted! Payment will be processed shortly.');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit request.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 420 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Withdraw Funds</h2>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div style={{ background: 'var(--accent-glow)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Available Balance</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-light)' }}>${parseFloat(available).toFixed(2)}</p>
                </div>

                <div style={{ background: 'rgba(79, 172, 254, 0.1)', border: '1px solid rgba(79, 172, 254, 0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>💰 Payment Information</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        All withdrawal requests are processed manually. Payments will be sent to your USDT wallet or Binance ID. You can withdraw any amount from your balance.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Withdrawal Method *</label>
                        <select className="form-input" value={walletType} onChange={e => setWalletType(e.target.value)} required>
                            <option value="usdt_bep20">USDT (BEP20) - Binance Smart Chain</option>
                            <option value="usdt_polygon">USDT (Polygon) - Polygon Network</option>
                            <option value="binance_id">Binance ID - Binance Pay</option>
                        </select>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            Choose your preferred payment method
                        </p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">
                            {walletType === 'binance_id' ? 'Binance ID' : 'Wallet Address'} *
                        </label>
                        <input type="text" className="form-input" 
                            placeholder={walletType === 'binance_id' ? 'Enter your Binance ID' : 'Enter your wallet address (0x...)'}
                            value={walletAddress} onChange={e => setWalletAddress(e.target.value)} required />
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            {walletType === 'binance_id' 
                                ? 'Your Binance Pay ID (e.g., 123456789)' 
                                : 'Your USDT wallet address on the selected network'}
                        </p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Amount (USD) *</label>
                        <input type="number" className="form-input" placeholder="Enter amount"
                            min="0.01" max={available} step="0.01"
                            value={amount} onChange={e => setAmount(e.target.value)} required />
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Maximum: ${parseFloat(available).toFixed(2)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? 'Submitting…' : 'Request Withdrawal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const txBadgeClass = (type) => {
    if (type === 'earning') return 'badge-approved';
    if (type === 'withdrawal') return 'badge-rejected';
    if (type === 'withdrawal_pending') return 'badge-pending';
    if (type === 'refund') return 'badge-claimed';
    return 'badge-inactive';
};

const txSign = (type) => ['withdrawal', 'withdrawal_pending'].includes(type) ? '-' : '+';
const txColor = (type) => ['withdrawal', 'withdrawal_pending'].includes(type) ? 'var(--danger)' : 'var(--accent-light)';

export default function Wallet() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showWithdraw, setShowWithdraw] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/wallet');
            setData(res.data);
        } catch {
            toast.error('Failed to load wallet.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) return <div className="spinner" />;

    const stats = [
        { label: 'Available Balance', value: data.balance, icon: <DollarSign size={20} />, cls: 'bg-blue', color: 'var(--accent-light)', main: true },
        { label: 'Total Earnings', value: data.total_earnings, icon: <TrendingUp size={20} />, cls: 'bg-green', color: 'var(--success)' },
        { label: 'Total Withdrawals', value: data.total_withdrawals, icon: <TrendingDown size={20} />, cls: 'bg-red', color: 'var(--danger)' },
        { label: 'Pending (Under Review)', value: data.pending_balance, icon: <Clock size={20} />, cls: 'bg-yellow', color: 'var(--warning)' },
    ];

    return (
        <div>
            {showWithdraw && (
                <WithdrawModal
                    available={data.balance}
                    onClose={() => setShowWithdraw(false)}
                    onSuccess={load}
                />
            )}

            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, width: '100%' }}>
                    <div>
                        <h1 className="page-title">My <span>Wallet</span></h1>
                        <p className="page-subtitle">Track your earnings and request withdrawals.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowWithdraw(true)}
                        disabled={data.balance <= 0} style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                        <Banknote size={16} /> Withdraw
                    </button>
                </div>
            </div>

            {/* 4-stat grid */}
            <div className="stats-grid" style={{ marginBottom: 28 }}>
                {stats.map(s => (
                    <div key={s.label} className={`stat-card ${s.main ? 'card-glow' : ''}`}>
                        <div className={`stat-icon ${s.cls}`} style={{ color: s.color }}>{s.icon}</div>
                        <div className="stat-label">{s.label}</div>
                        <div className="stat-value" style={{ color: s.color }}>${parseFloat(s.value).toFixed(2)}</div>
                    </div>
                ))}
            </div>

            {/* Withdrawal requests */}
            {data.withdrawal_requests?.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                    <div className="section-header">
                        <span className="section-title">Withdrawal Requests</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.withdrawal_requests.length} total</span>
                    </div>
                    <div className="card" style={{ padding: 0 }}>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Wallet/ID</th>
                                        <th>Method</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.withdrawal_requests.map(wr => (
                                        <tr key={wr.id}>
                                            <td data-label="Wallet/ID" style={{ fontFamily: 'monospace', fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {wr.wallet_address || wr.upi_id || 'N/A'}
                                            </td>
                                            <td data-label="Method" style={{ fontSize: 12 }}>
                                                {wr.wallet_type === 'usdt_bep20' ? 'USDT (BEP20)' : 
                                                 wr.wallet_type === 'usdt_polygon' ? 'USDT (Polygon)' : 
                                                 wr.wallet_type === 'binance_id' ? 'Binance ID' : 
                                                 wr.upi_id ? 'UPI' : 'N/A'}
                                            </td>
                                            <td data-label="Amount" style={{ color: 'var(--danger)', fontWeight: 700 }}>-${parseFloat(wr.amount).toFixed(2)}</td>
                                            <td data-label="Status">
                                                <span className={`badge ${wr.status === 'paid' ? 'badge-approved' : wr.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                                                    {wr.status.toUpperCase()}
                                                </span>
                                                {wr.admin_note && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{wr.admin_note}</div>}
                                            </td>
                                            <td data-label="Date" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                {new Date(wr.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction history */}
            <div className="section-header">
                <span className="section-title">Transaction History</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{data.transactions.length} total</span>
            </div>

            {data.transactions.length === 0 ? (
                <div className="empty-state"><DollarSign /><p>No transactions yet. Complete tasks to earn!</p></div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Type</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.transactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td data-label="Description">{tx.description}</td>
                                        <td data-label="Amount" style={{ color: txColor(tx.type), fontWeight: 700 }}>
                                            {txSign(tx.type)}${parseFloat(tx.amount).toFixed(2)}
                                        </td>
                                        <td data-label="Type"><span className={`badge ${txBadgeClass(tx.type)}`}>{tx.type.replace('_', ' ').toUpperCase()}</span></td>
                                        <td data-label="Date" style={{ color: 'var(--text-muted)' }}>
                                            {new Date(tx.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
