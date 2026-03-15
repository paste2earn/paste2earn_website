import { useState, useEffect } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { X, CheckCircle2, XCircle, Copy } from 'lucide-react';

function ReviewModal({ wr, onClose, onDone }) {
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);

    const handle = async (status) => {
        setLoading(true);
        try {
            await api.patch(`/admin/withdrawals/${wr.id}`, { status, admin_note: note });
            toast.success(`Withdrawal marked as ${status}.`);
            onDone();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed.');
        } finally {
            setLoading(false);
        }
    };

    const copyWallet = () => {
        navigator.clipboard.writeText(wr.wallet_address || wr.upi_id);
        toast.success('Wallet address copied!');
    };

    const walletLabel = wr.wallet_type === 'binance_id' ? 'Binance ID' :
                        wr.wallet_type === 'usdt_bep20' ? 'USDT Wallet (BEP20)' :
                        wr.wallet_type === 'usdt_polygon' ? 'USDT Wallet (Polygon)' :
                        wr.wallet_type === 'upi' ? 'UPI ID' : 'Wallet Address';

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 460 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Review Withdrawal #{wr.id}</h2>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="card" style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>User</div>
                        <div style={{ fontWeight: 700 }}>{wr.username}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{wr.email}</div>
                    </div>

                    <div className="card" style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Amount to Pay</div>
                        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-light)' }}>
                            ${parseFloat(wr.amount).toFixed(2)}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{walletLabel}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <code style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', flex: 1, wordBreak: 'break-all' }}>
                                {wr.wallet_address || wr.upi_id}
                            </code>
                            <button className="btn btn-secondary btn-sm" onClick={copyWallet} title={`Copy ${walletLabel}`}>
                                <Copy size={13} />
                            </button>
                        </div>
                        {wr.wallet_type && wr.wallet_type !== 'upi' && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, padding: '6px 10px', background: 'rgba(79, 172, 254, 0.1)', borderRadius: 6 }}>
                                <strong>Network:</strong> {wr.wallet_type === 'usdt_bep20' ? 'Binance Smart Chain (BEP20)' : wr.wallet_type === 'usdt_polygon' ? 'Polygon Network' : 'Binance Pay'}
                            </div>
                        )}
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                            ⚠️ Send payment manually to this {walletLabel.toLowerCase()}, then mark as paid below.
                        </p>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Admin Note (optional)</label>
                        <input type="text" className="form-input" placeholder="e.g. Paid via GPay, UTR: 12345"
                            value={note} onChange={e => setNote(e.target.value)} />
                    </div>
                </div>

                <div className="divider" />

                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-danger btn-full" onClick={() => handle('rejected')} disabled={loading}>
                        <XCircle size={16} /> Reject & Refund
                    </button>
                    <button className="btn btn-primary btn-full" onClick={() => handle('paid')} disabled={loading}>
                        <CheckCircle2 size={16} /> Mark as Paid
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminWithdrawals() {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [selected, setSelected] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/withdrawals');
            setWithdrawals(res.data);
        } catch {
            toast.error('Failed to load withdrawals.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = withdrawals.filter(w => filter === 'all' || w.status === filter);

    const counts = {
        all: withdrawals.length,
        pending: withdrawals.filter(w => w.status === 'pending').length,
        paid: withdrawals.filter(w => w.status === 'paid').length,
        rejected: withdrawals.filter(w => w.status === 'rejected').length,
    };

    return (
        <div>
            {selected && (
                <ReviewModal wr={selected} onClose={() => setSelected(null)} onDone={load} />
            )}

            <div className="page-header">
                <h1 className="page-title">Withdrawal <span>Requests</span></h1>
                <p className="page-subtitle">Review and pay USDT/Binance withdrawal requests manually.</p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'pending', label: '⏳ Pending' },
                    { key: 'paid', label: '✅ Paid' },
                    { key: 'rejected', label: '❌ Rejected' },
                ].map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)}
                        className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`}>
                        {f.label}
                        <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                            {counts[f.key]}
                        </span>
                    </button>
                ))}
            </div>

            {loading ? <div className="spinner" /> : filtered.length === 0 ? (
                <div className="empty-state"><p>No withdrawal requests found.</p></div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>User</th>
                                    <th>Wallet/ID</th>
                                    <th>Method</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(wr => (
                                    <tr key={wr.id}>
                                        <td data-label="#">
                                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>#{wr.id}</span>
                                        </td>
                                        <td data-label="User">
                                            <div style={{ fontWeight: 600 }}>{wr.username}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{wr.email}</div>
                                        </td>
                                        <td data-label="Wallet/ID" style={{ maxWidth: 200 }}>
                                            <code style={{ fontSize: 12, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                                                {wr.wallet_address || wr.upi_id || 'N/A'}
                                            </code>
                                        </td>
                                        <td data-label="Method" style={{ fontSize: 12 }}>
                                            {wr.wallet_type === 'usdt_bep20' ? 'USDT (BEP20)' :
                                             wr.wallet_type === 'usdt_polygon' ? 'USDT (Polygon)' :
                                             wr.wallet_type === 'binance_id' ? 'Binance ID' :
                                             wr.wallet_type === 'upi' ? 'UPI' : 
                                             wr.upi_id ? 'UPI' : 'N/A'}
                                        </td>
                                        <td data-label="Amount" style={{ color: 'var(--accent-light)', fontWeight: 700 }}>
                                            ${parseFloat(wr.amount).toFixed(2)}
                                        </td>
                                        <td data-label="Status">
                                            <span className={`badge ${wr.status === 'paid' ? 'badge-approved' : wr.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                                                {wr.status.toUpperCase()}
                                            </span>
                                            {wr.reviewed_by_name && (
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                                                    by <strong>{wr.reviewed_by_name}</strong>
                                                </div>
                                            )}
                                            {wr.admin_note && (
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                                                    {wr.admin_note}
                                                </div>
                                            )}
                                        </td>
                                        <td data-label="Date" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(wr.created_at).toLocaleDateString()}
                                        </td>
                                        <td data-label="Action">
                                            {wr.status === 'pending' ? (
                                                <button className="btn btn-primary btn-sm" onClick={() => setSelected(wr)}>
                                                    Review
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                                            )}
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
