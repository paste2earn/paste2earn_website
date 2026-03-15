import { useState } from 'react';
import api from '../../api';
import toast from 'react-hot-toast';
import { PlusCircle } from 'lucide-react';

export default function AdminCreateTask() {
    const [form, setForm] = useState({
        type: 'comment',
        title: '',
        target_url: '',
        comment_text: '',
        subreddit_url: '',
        post_title: '',
        post_body: '',
        reward: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = e => {
        let val = e.target.value;
        if (e.target.type === 'url' && val.includes('?')) {
            val = val.split('?')[0];
        }
        setForm({ ...form, [e.target.name]: val });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await api.post('/admin/tasks', {
                ...form,
                reward: parseFloat(form.reward)
            });
            const taskId = response.data.task.id;
            toast.success(`Task created successfully! Task ID: #${taskId}`);
            setForm({
                type: 'comment', title: '', target_url: '', comment_text: '',
                subreddit_url: '', post_title: '', post_body: '', reward: ''
            });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create task.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Create <span>Task</span></h1>
                <p className="page-subtitle">Task IDs are auto-assigned starting from <strong>#1000</strong>.</p>
            </div>

            <div className="card" style={{ maxWidth: 600 }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Task Type *</label>
                        <select name="type" className="form-select" value={form.type} onChange={handleChange}>
                            <option value="comment">💬 Comment Task — $0.30</option>
                            <option value="reply">💬 Reply to comment — $0.30</option>
                            <option value="post">📝 Post Task — $2.00</option>
                        </select>
                    </div>

                    {/* ─── COMMENT / REPLY TASK: only URL + comment ─── */}
                    {(form.type === 'comment' || form.type === 'reply') && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Reddit Post URL *</label>
                                <input type="url" name="target_url" className="form-input"
                                    placeholder="https://www.reddit.com/r/MotivationalQuotes/comments/..."
                                    value={form.target_url} onChange={handleChange} required />
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                                    Task title is auto-generated from this URL
                                </p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Comment to Post *</label>
                                <textarea name="comment_text" className="form-textarea"
                                    placeholder="e.g. great post"
                                    value={form.comment_text} onChange={handleChange} required rows={4} />
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                                    Exact comment users must leave on the Reddit post
                                </p>
                            </div>
                        </>
                    )}

                    {/* ─── POST TASK ─── */}
                    {form.type === 'post' && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Subreddit URL *</label>
                                <input type="url" name="subreddit_url" className="form-input"
                                    placeholder="https://www.reddit.com/r/MotivationalQuotes/"
                                    value={form.subreddit_url} onChange={handleChange} required />
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                                    Task title is auto-generated from this URL
                                </p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Post Title</label>
                                <input type="text" name="post_title" className="form-input"
                                    placeholder="great one" value={form.post_title} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Post Body</label>
                                <textarea name="post_body" className="form-textarea"
                                    placeholder="be always motivated" value={form.post_body} onChange={handleChange} />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label className="form-label">Reward (USD) *</label>
                        <input type="number" name="reward" className="form-input"
                            placeholder={(form.type === 'comment' || form.type === 'reply') ? '1.50' : '2.00'}
                            value={form.reward} onChange={handleChange}
                            min="0.1" step="0.01" required />
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                            Standard: Comment = $0.30 · Post = $2.00
                        </p>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                        <PlusCircle size={18} />
                        {loading ? 'Creating...' : 'Create Task'}
                    </button>
                </form>
            </div>
        </div>
    );
}
