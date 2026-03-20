export default function Info() {
    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">How It <span>Works</span></h1>
                <p className="page-subtitle">Everything you need to know about earning on Paste2Earn.</p>
            </div>

            <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(79, 172, 254, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)', border: '1px solid rgba(79, 172, 254, 0.3)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    🏆 User Tier System
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Admin verifies your Reddit profile and assigns you to a tier based on your karma and account age.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                    <div style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: 10, padding: 16 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#FFD700', marginBottom: 8 }}>🥇 Gold</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <strong>Requirements:</strong><br />
                            • 1,000+ Reddit karma<br />
                            • 1+ year account age<br /><br />
                            <strong style={{ color: 'var(--text-primary)' }}>Access:</strong> Comment + Post tasks
                        </p>
                    </div>
                    <div style={{ background: 'rgba(192, 192, 192, 0.1)', border: '1px solid rgba(192, 192, 192, 0.3)', borderRadius: 10, padding: 16 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#C0C0C0', marginBottom: 8 }}>🥈 Silver</p>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <strong>Requirements:</strong><br />
                            • 200+ Reddit karma<br />
                            • 3+ months account age<br /><br />
                            <strong style={{ color: 'var(--text-primary)' }}>Access:</strong> Comment tasks only
                        </p>
                    </div>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14, fontStyle: 'italic' }}>
                    💡 Silver users can be upgraded to Gold later by admin if their Reddit account grows.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-light)', marginBottom: 16 }}>
                        💬 Comment & Reply Tasks : $0.30
                    </h3>
                    <div className="info-step">
                        <div className="info-step-num">1</div>
                        <div>
                            <strong>Claim the task</strong>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Click "Claim Task" on the Tasks page to lock it to your account.</p>
                        </div>
                    </div>
                    <div className="info-step">
                        <div className="info-step-num">2</div>
                        <div>
                            <strong>Visit the Reddit post</strong>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Open the Reddit link provided and post the <strong style={{ color: 'var(--text-primary)' }}>exact comment text</strong> shown in your task.</p>
                        </div>
                    </div>
                    <div className="info-step">
                        <div className="info-step-num">3</div>
                        <div>
                            <strong>Submit proof</strong>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Go to "My Tasks", click Submit, paste the URL of your comment and copy 3 random comments from the thread.</p>
                        </div>
                    </div>
                    <div className="info-step">
                        <div className="info-step-num">4</div>
                        <div>
                            <strong>Get paid</strong>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Admin reviews and approves <strong style={{ color: 'var(--accent-light)' }}>$0.30</strong> is credited to your wallet.</p>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f472b6', marginBottom: 8 }}>
                        📝 Post Tasks : $2.00
                    </h3>
                    <p style={{ fontSize: 11, color: '#FFD700', fontWeight: 600, marginBottom: 16 }}>
                        🥇 Gold Users Only
                    </p>
                    <div className="info-step">
                        <div className="info-step-num">1</div>
                        <div>
                            <strong>Claim the task</strong>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Click "Claim Task" to lock the post task to your account.</p>
                        </div>
                    </div>
                    <div className="info-step">
                        <div className="info-step-num">2</div>
                        <div>
                            <strong>Create the Reddit post</strong>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Go to the specified subreddit and create a new post using the exact title and body shown in the task.</p>
                        </div>
                    </div>
                    <div className="info-step">
                        <div className="info-step-num">3</div>
                        <div>
                            <strong>Submit the post URL</strong>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Go to "My Tasks", click Submit, and paste the URL of your new Reddit post.</p>
                        </div>
                    </div>
                    <div className="info-step">
                        <div className="info-step-num">4</div>
                        <div>
                            <strong>Get paid</strong>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Admin reviews and approves <strong style={{ color: '#f472b6' }}>$2.00</strong> is credited to your wallet.</p>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ gridColumn: '1 / -1' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--warning)', marginBottom: 16 }}>
                        ⚠️ Rules & Guidelines
                    </h3>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 4 }}>
                        {[
                            'Your Reddit account must be active',
                            'Comments and posts must match the assigned text exactly, spelling mistakes will result in a request for REVISION.',
                            'If your post or comment is removed by Reddit Automoderator, the task will be marked as FAILED.',
                            'Admin reviews all submissions before payment, this may take up to 24 hours.',
                            'Submitting false URLs or fake proof will result in account suspension.',
                            'Earnings are credited only after admin approval. No early withdrawals.',
                        ].map((rule, i) => (
                            <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--text-secondary)', listStyle: 'none' }}>
                                <span style={{ color: 'var(--warning)', flexShrink: 0 }}>•</span>
                                {rule}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
