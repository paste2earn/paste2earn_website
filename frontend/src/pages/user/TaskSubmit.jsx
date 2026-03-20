import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import { ExternalLink, Copy, CheckCircle, AlertTriangle, Send, ChevronRight, User, Clock, AlertCircle } from 'lucide-react';

export default function TaskSubmit() {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [copiedContent, setCopiedContent] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);

    // Form state
    const [form, setForm] = useState({ submitted_url: '', comment1: '', comment2: '', comment3: '' });

    // Markdown check state
    const [mdChecks, setMdChecks] = useState({ step1: false, step2: false, step3: false });

    useEffect(() => {
        const fetchTask = async () => {
            try {
                const res = await api.get(`/tasks/my/${taskId}`);
                setTask(res.data);
                if (res.data.submitted_url) {
                    setForm(prev => ({ ...prev, submitted_url: res.data.submitted_url }));
                }
            } catch (err) {
                toast.error('Task not found or not claimed by you.');
                navigate('/my-tasks');
            } finally {
                setLoading(false);
            }
        };
        fetchTask();
    }, [taskId, navigate]);

    useEffect(() => {
        if (!task || task.status !== 'claimed') return;

        const timer = setInterval(() => {
            const expiresAt = new Date(new Date(task.created_at).getTime() + 60 * 60 * 1000);
            const now = new Date();
            const diff = expiresAt - now;

            if (diff <= 0) {
                setTimeLeft('Expired');
                clearInterval(timer);
            } else {
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [task]);

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedContent(id);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopiedContent(null), 2000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // For comment/reply, require markdown checkboxes to be acknowledged (UI only prevention)
        if ((task.type === 'comment' || task.type === 'reply') && (!mdChecks.step1 || !mdChecks.step2 || !mdChecks.step3)) {
            return toast.error('You must acknowledge all Markdown Editor steps before submitting!');
        }

        setSubmitting(true);
        try {
            await api.post(`/tasks/${taskId}/submit`, form);
            toast.success(task.status === 'revision_needed'
                ? 'Resubmission sent! Admin will re-review your work.'
                : 'Submission sent! Awaiting admin verification.');
            navigate('/my-tasks');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Submission failed.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="loading-page"><div className="spinner" /></div>;
    if (!task) return null;

    const isCommentOrReply = task.type === 'comment' || task.type === 'reply';
    const isPost = task.type === 'post';
    const num = { curr: 1 }; // Step counter

    const isClaimedOrRevision = task.status === 'claimed' || task.status === 'revision_needed';

    let computedSubredditUrl = task.subreddit_url;
    let computedSubredditName = 'Subreddit';

    if (computedSubredditUrl) {
        try {
            const match = new URL(computedSubredditUrl).pathname.match(/\/r\/([^\/]+)/i);
            if (match) computedSubredditName = 'r/' + match[1];
        } catch (e) { }
    } else if (task.target_url) {
        try {
            const urlObj = new URL(task.target_url);
            const match = urlObj.pathname.match(/\/r\/([^\/]+)/i);
            if (match) {
                computedSubredditName = 'r/' + match[1];
                computedSubredditUrl = `${urlObj.origin}/r/${match[1]}`;
            }
        } catch (e) { }
    }

    return (
        <div style={{ maxWidth: 850, margin: '0 auto', paddingBottom: 60 }}>
            {/* Header Section */}
            {task.status === 'claimed' && timeLeft && (
                <div style={{
                    background: timeLeft === 'Expired' ? 'rgba(239,68,68,0.1)' : 'rgba(37,99,235,0.05)',
                    border: timeLeft === 'Expired' ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(37,99,235,0.15)',
                    borderRadius: 12,
                    padding: '8px 16px',
                    marginBottom: 20,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: timeLeft === 'Expired' ? '#ef4444' : 'var(--blue)'
                }}>
                    <Clock size={16} />
                    <span>{timeLeft === 'Expired' ? 'Submission time has expired — please refresh or claim again' : `Complete this task within: ${timeLeft}`}</span>
                </div>
            )}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Task: {task.title}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)' }}>
                        ${parseFloat(task.reward).toFixed(2)}
                    </div>
                    <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ').toUpperCase()}</span>
                </div>
            </div>

            {task.status === 'revision_needed' && task.admin_note && (
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '14px 18px', marginBottom: 24 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={16} /> Admin Feedback (Revision Required)</p>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>{task.admin_note}</p>
                </div>
            )}

            {/* Step 1: Subreddit */}
            {computedSubredditUrl && (
                <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
                    <div style={{ background: 'rgba(37,99,235,0.1)', borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 28, height: 28, background: '#5865F2', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{num.curr++}</div>
                        <h2 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>Join the Subreddit First</h2>
                    </div>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <h3 style={{ fontSize: 18, margin: '0 0 4px 0' }}>{computedSubredditName}</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>You must join this community before you can post</p>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="btn btn-secondary" onClick={() => handleCopy(computedSubredditUrl, 'sub')}>Copy URL</button>
                                <a href={computedSubredditUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                                    <ExternalLink size={16} /> Go Join
                                </a>
                            </div>
                        </div>
                        <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', padding: 16, borderRadius: 8, marginTop: 16, display: 'flex', gap: 12 }}>
                            <AlertCircle size={20} color="var(--accent-light)" style={{ flexShrink: 0 }} />
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: 14 }}>Why join first?</h4>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>Reddit requires you to be a member of a community before you can post or comment in it. Click 'Go Join' above, then click the 'Join' button on the subreddit page.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Context block for comments/replies */}
            {isCommentOrReply && task.target_url && (
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 12 }}>Reddit Context To {task.type === 'reply' ? 'Reply To' : 'Comment On'}</h3>
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                        <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
                            {task.description || "Open the link carefully to see the exact thread context."}
                        </p>
                    </div>
                </div>
            )}

            {/* Step 2: Go to Target */}
            {task.target_url && (
                <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
                    <div style={{ background: 'rgba(16,185,129,0.1)', borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 28, height: 28, background: '#10B981', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{num.curr++}</div>
                        <h2 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>Go to the {isPost ? 'Subreddit' : isCommentOrReply ? (task.type === 'reply' ? 'Comment' : 'Post') : 'Target'}</h2>
                    </div>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 8 }}>
                            <code style={{ fontSize: 13, color: 'var(--blue)', wordBreak: 'break-all', paddingRight: 10 }}>{task.target_url}</code>
                            <a href={task.target_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                                <ExternalLink size={14} /> Open
                            </a>
                        </div>
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginTop: 12 }}>
                            Open the {task.type === 'post' ? 'subreddit and create a new post' : `link and click ${task.type === 'reply' ? 'Reply under the specific comment' : 'Comment'}`}.
                        </div>
                    </div>
                </div>
            )}

            {/* REQUIRED: Markdown Editor */}
            {isCommentOrReply && (
                <div style={{ background: 'rgba(217,119,6,0.05)', border: '1px solid rgba(217,119,6,0.3)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#D97706', marginBottom: 12 }}>
                        <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                            <h3 style={{ fontSize: 15, margin: '0 0 4px 0', fontWeight: 700 }}>REQUIRED: Use Reddit Markdown Editor</h3>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>This reply is provided in <strong>Reddit Markdown</strong>. Do <strong>NOT</strong> paste into Rich Text mode.</p>
                        </div>
                    </div>

                    <p style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 10 }}>Check off each step in order:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-card)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                            <input type="checkbox" checked={mdChecks.step1} onChange={e => setMdChecks(p => ({ ...p, step1: e.target.checked }))} style={{ width: 16, height: 16 }} />
                            1. Click inside the reply box, then click "Switch to Markdown Editor"
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                            <input type="checkbox" checked={mdChecks.step2} onChange={e => setMdChecks(p => ({ ...p, step2: e.target.checked }))} style={{ width: 16, height: 16 }} />
                            2. Paste the copied content into Markdown mode
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                            <input type="checkbox" checked={mdChecks.step3} onChange={e => setMdChecks(p => ({ ...p, step3: e.target.checked }))} style={{ width: 16, height: 16 }} />
                            3. Switch back to Rich Text to verify formatting is applied correctly
                        </label>
                    </div>

                    <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginTop: 12, display: 'flex', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>🚫</span>
                        <span>If the content is not properly formatted (you didn't use the Markdown editor), your submission will be rejected and you will <strong>not be paid</strong> for this task.</span>
                    </div>
                </div>
            )}

            {/* Step 3/4: Content to Copy */}
            <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
                <div style={{ background: 'rgba(124,58,237,0.1)', borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, background: '#7C3AED', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{num.curr++}</div>
                    <h2 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>Copy Content {isCommentOrReply && '(Markdown)'}</h2>
                </div>
                <div style={{ padding: '20px' }}>

                    {isPost ? (
                        <>
                            {task.post_title && (
                                <div style={{ marginBottom: 20 }}>
                                    <h4 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Post Title</h4>
                                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: 8, fontSize: 15, position: 'relative', paddingRight: 60 }}>
                                        {task.post_title}
                                        <button onClick={() => handleCopy(task.post_title, 'title')} style={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 8, borderRadius: 6, cursor: 'pointer', color: copiedContent === 'title' ? 'var(--success)' : 'var(--text-primary)' }}>
                                            {copiedContent === 'title' ? <CheckCircle size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {task.post_body && (
                                <div>
                                    <h4 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Post Body</h4>
                                    <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: 8, fontSize: 15, position: 'relative', whiteSpace: 'pre-wrap', paddingRight: 60 }}>
                                        {task.post_body}
                                        <button onClick={() => handleCopy(task.post_body, 'body')} style={{ position: 'absolute', top: 16, right: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 8, borderRadius: 6, cursor: 'pointer', color: copiedContent === 'body' ? 'var(--success)' : 'var(--text-primary)' }}>
                                            {copiedContent === 'body' ? <CheckCircle size={16} /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        task.comment_text && (
                            <div>
                                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: 8, fontSize: 15, position: 'relative', whiteSpace: 'pre-wrap', paddingRight: 60, lineHeight: 1.6 }}>
                                    {task.comment_text}
                                    <button onClick={() => handleCopy(task.comment_text, 'comment')} style={{ position: 'absolute', top: 16, right: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', padding: 8, borderRadius: 6, cursor: 'pointer', color: copiedContent === 'comment' ? 'var(--success)' : 'var(--text-primary)' }}>
                                        {copiedContent === 'comment' ? <CheckCircle size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12, marginBottom: 0 }}>
                                    Paste into Reddit Markdown Editor. Replace any image placeholders with actual images if instructed.
                                </p>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Step 4/5: Submit Proof */}
            <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, background: '#3B82F6', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{num.curr++}</div>
                    <h2 style={{ fontSize: 16, margin: 0, fontWeight: 700 }}>Submit Proof</h2>
                </div>

                <div style={{ padding: '24px 20px' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 15 }}>
                                {isCommentOrReply ? 'link of your task comment' : 'link of your task post'} *
                            </label>
                            <input
                                type="url"
                                className="form-input"
                                placeholder={`https://reddit.com/r/${isPost ? '.../comments/...' : '.../comment/...'}`}
                                value={form.submitted_url}
                                onChange={e => {
                                    let val = e.target.value.split('?')[0];
                                    setForm(f => ({ ...f, submitted_url: val }));
                                }}
                                disabled={!isClaimedOrRevision}
                                required
                            />
                        </div>

                        {isCommentOrReply && (
                            <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', padding: 16, borderRadius: 12, marginTop: 24 }}>
                                <div style={{ display: 'flex', gap: 10, color: '#3B82F6', marginBottom: 16 }}>
                                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                    <p style={{ margin: 0, fontSize: 13 }}>
                                        Paste links to 3 random comments from <strong>3 DIFFERENT subreddits</strong> (do not paste the main task link!).
                                    </p>
                                </div>
                                {[1, 2, 3].map(n => (
                                    <div className="form-group" key={n} style={{ marginBottom: n === 3 ? 0 : 16 }}>
                                        <label className="form-label">Comment {n} *</label>
                                        <input
                                            type="url"
                                            className="form-input"
                                            placeholder="https://reddit.com/r/..."
                                            value={form[`comment${n}`] || ''}
                                            onChange={e => {
                                                let val = e.target.value.split('?')[0];
                                                setForm(f => ({ ...f, [`comment${n}`]: val }));
                                            }}
                                            disabled={!isClaimedOrRevision}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {isClaimedOrRevision ? (
                            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={submitting} style={{ marginTop: 30 }}>
                                <Send size={18} /> {submitting ? 'Submitting...' : 'Submit for Review'}
                            </button>
                        ) : (
                            <div className="alert alert-info" style={{ marginTop: 30, justifyContent: 'center' }}>
                                This task is currently: <strong>{task.status.replace('_', ' ').toUpperCase()}</strong>. You cannot submit.
                            </div>
                        )}
                    </form>
                </div>
            </div>

        </div>
    );
}
