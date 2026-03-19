import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';
import toast from 'react-hot-toast';
import {
    UploadCloud, FileSpreadsheet, Download, CheckCircle,
    XCircle, AlertCircle, Trash2, ChevronDown, ChevronUp, X,
    MessageSquare, FileText
} from 'lucide-react';

// ──────────────────────────────────────────────
// Separate template definitions
// ──────────────────────────────────────────────

// Comment / Reply template — only columns relevant to these types
const COMMENT_COLS  = ['type', 'target_url', 'comment_text', 'reward', 'description'];
const COMMENT_ROWS  = [
    {
        type: 'comment',
        target_url: 'https://www.reddit.com/r/MotivationalQuotes/comments/abc123/some_post/',
        comment_text: 'Great post! Very motivating.',
        reward: 0.30,
        description: ''
    },
    {
        type: 'comment',
        target_url: 'https://www.reddit.com/r/GetMotivated/comments/xyz789/another_post/',
        comment_text: 'This really inspired me, thanks for sharing!',
        reward: 0.30,
        description: ''
    },
    {
        type: 'reply',
        target_url: 'https://www.reddit.com/r/AskReddit/comments/def456/some_question/',
        comment_text: 'Totally agree with this perspective!',
        reward: 0.30,
        description: ''
    },
];

// Post template — only columns relevant to post tasks
const POST_COLS = ['type', 'subreddit_url', 'post_title', 'post_body', 'reward', 'description'];
const POST_ROWS = [
    {
        type: 'post',
        subreddit_url: 'https://www.reddit.com/r/Entrepreneur/',
        post_title: 'My success story',
        post_body: 'Starting from scratch, I built something amazing...',
        reward: 2.00,
        description: ''
    },
    {
        type: 'post',
        subreddit_url: 'https://www.reddit.com/r/MotivationalQuotes/',
        post_title: 'Daily inspiration thread',
        post_body: 'Share your favourite quote below!',
        reward: 2.00,
        description: ''
    },
];

function downloadCommentTemplate() {
    const ws = XLSX.utils.json_to_sheet(COMMENT_ROWS, { header: COMMENT_COLS });
    ws['!cols'] = [{ wch: 10 }, { wch: 65 }, { wch: 50 }, { wch: 10 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comment & Reply Tasks');
    XLSX.writeFile(wb, 'template_comment_reply.xlsx');
}

function downloadPostTemplate() {
    const ws = XLSX.utils.json_to_sheet(POST_ROWS, { header: POST_COLS });
    ws['!cols'] = [{ wch: 10 }, { wch: 45 }, { wch: 30 }, { wch: 40 }, { wch: 10 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Post Tasks');
    XLSX.writeFile(wb, 'template_post.xlsx');
}

// ──────────────────────────────────────────────
// Row validation (works for both template types)
// ──────────────────────────────────────────────
function validateRow(r) {
    const errors = [];
    const type = (r.type || '').toLowerCase();
    const reward = parseFloat(r.reward);
    const target_url = (r.target_url || '').trim();
    const subreddit_url = (r.subreddit_url || '').trim();

    if (!['comment', 'post', 'reply'].includes(type))
        errors.push('type must be comment, reply, or post');
    if (!reward || isNaN(reward) || reward <= 0)
        errors.push('reward must be > 0');
    if ((type === 'comment' || type === 'reply') && !target_url)
        errors.push('target_url required for comment/reply');
    if (type === 'post' && !subreddit_url)
        errors.push('subreddit_url required for post');

    return errors;
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────
export default function BulkUpload() {
    const [file, setFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [showFailures, setShowFailures] = useState(true);
    const fileInputRef = useRef();

    // ── Parse file client-side for preview ──
    const parseFile = useCallback((f) => {
        setFile(f);
        setResult(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

                const normalised = data.map((row) => {
                    const out = {};
                    for (const k of Object.keys(row)) {
                        out[k.trim().toLowerCase().replace(/ /g, '_')] =
                            typeof row[k] === 'string' ? row[k].trim() : row[k];
                    }
                    return out;
                });

                const enriched = normalised.map((r, i) => ({
                    ...r,
                    _rowNum: i + 2,
                    _errors: validateRow(r)
                }));

                setRows(enriched);
            } catch {
                toast.error('Could not read file. Make sure it is a valid .xlsx or .csv.');
            }
        };
        reader.readAsArrayBuffer(f);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) parseFile(f);
    }, [parseFile]);

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) parseFile(f);
    };

    const clearFile = () => {
        setFile(null);
        setRows([]);
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleUpload = async () => {
        if (!file) return;
        const validRows = rows.filter(r => r._errors.length === 0);
        if (validRows.length === 0) {
            toast.error('All rows have errors. Fix the file before uploading.');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/admin/tasks/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult(res.data);
            toast.success(res.data.message);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const validRows = rows.filter(r => r._errors.length === 0);
    const invalidRows = rows.filter(r => r._errors.length > 0);

    return (
        <div>
            {/* ── Section header ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 20
            }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(79,172,254,0.2) 100%)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <FileSpreadsheet size={20} color="var(--success)" />
                </div>
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                        Bulk Upload via <span style={{ color: 'var(--success)' }}>Excel / CSV</span>
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                        Upload multiple tasks at once using a spreadsheet
                    </p>
                </div>
            </div>

            {/* ── Template download cards ── */}
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24
            }}>
                {/* Comment / Reply template */}
                <div style={{
                    padding: '16px 18px',
                    borderRadius: 12,
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    display: 'flex', flexDirection: 'column', gap: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MessageSquare size={16} color="var(--accent-purple-dark)" />
                        <span style={{ fontWeight: 700, fontSize: 13 }}>Comment &amp; Reply Template</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                        Columns: <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>type</code>{' '}
                        <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>target_url</code>{' '}
                        <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>comment_text</code>{' '}
                        <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>reward</code>
                    </p>
                    <button
                        onClick={downloadCommentTemplate}
                        className="btn btn-secondary btn-sm"
                        style={{ alignSelf: 'flex-start', borderColor: 'rgba(99,102,241,0.3)', color: 'var(--accent-purple-dark)' }}
                    >
                        <Download size={13} />
                        Download (.xlsx)
                    </button>
                </div>

                {/* Post template */}
                <div style={{
                    padding: '16px 18px',
                    borderRadius: 12,
                    background: 'rgba(236,72,153,0.06)',
                    border: '1px solid rgba(236,72,153,0.2)',
                    display: 'flex', flexDirection: 'column', gap: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={16} color="var(--accent-light)" />
                        <span style={{ fontWeight: 700, fontSize: 13 }}>Post Template</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                        Columns: <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>type</code>{' '}
                        <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>subreddit_url</code>{' '}
                        <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>post_title</code>{' '}
                        <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>post_body</code>{' '}
                        <code style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>reward</code>
                    </p>
                    <button
                        onClick={downloadPostTemplate}
                        className="btn btn-secondary btn-sm"
                        style={{ alignSelf: 'flex-start', borderColor: 'rgba(236,72,153,0.3)', color: 'var(--accent-light)' }}
                    >
                        <Download size={13} />
                        Download (.xlsx)
                    </button>
                </div>
            </div>

            {/* ── Drop zone ── */}
            {!file && (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: `2px dashed ${dragging ? 'var(--success)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-lg)',
                        padding: '44px 24px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: dragging ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.01)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <UploadCloud
                        size={44}
                        color={dragging ? 'var(--success)' : 'var(--text-muted)'}
                        style={{ marginBottom: 12, transition: 'color 0.2s' }}
                    />
                    <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>
                        {dragging ? 'Drop it here!' : 'Drag & drop your filled template'}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        or click to browse · .xlsx, .xls, .csv · max 5 MB
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                </div>
            )}

            {/* ── File selected indicator ── */}
            {file && !result && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 10, marginBottom: 16
                }}>
                    <FileSpreadsheet size={18} color="var(--success)" />
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{file.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {rows.length} row{rows.length !== 1 ? 's' : ''} detected
                        {validRows.length > 0 && ` · ${validRows.length} valid`}
                        {invalidRows.length > 0 && ` · ${invalidRows.length} with errors`}
                    </span>
                    <button
                        onClick={clearFile}
                        style={{ padding: '4px 8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title="Remove file"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* ── Preview table ── */}
            {rows.length > 0 && !result && (
                <>
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Preview ({rows.length} rows)
                        </span>
                        {invalidRows.length > 0 && (
                            <span style={{
                                fontSize: 11, fontWeight: 700, padding: '2px 8px',
                                borderRadius: 20, background: 'rgba(239,68,68,0.12)',
                                color: 'var(--danger)'
                            }}>
                                {invalidRows.length} row{invalidRows.length > 1 ? 's' : ''} with errors
                            </span>
                        )}
                        {validRows.length > 0 && (
                            <span style={{
                                fontSize: 11, fontWeight: 700, padding: '2px 8px',
                                borderRadius: 20, background: 'rgba(16,185,129,0.12)',
                                color: 'var(--success)'
                            }}>
                                {validRows.length} valid
                            </span>
                        )}
                    </div>

                    <div className="table-wrap card" style={{ padding: 0, marginBottom: 16, maxHeight: 360, overflowY: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>#</th>
                                    <th>Type</th>
                                    <th>URL</th>
                                    <th>Comment / Post Text</th>
                                    <th>Reward</th>
                                    <th style={{ width: 60 }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => {
                                    const hasError = r._errors.length > 0;
                                    const url = r.target_url || r.subreddit_url || '—';
                                    const text = r.comment_text || r.post_title || '—';
                                    return (
                                        <tr key={r._rowNum} style={hasError ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r._rowNum}</td>
                                            <td>
                                                <span className={`badge badge-${r.type === 'post' ? 'post' : 'comment'}`}>
                                                    {r.type || '??'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontSize: 11, color: 'var(--blue)',
                                                    maxWidth: 220, display: 'block',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                }} title={url}>
                                                    {url}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontSize: 12, color: 'var(--text-secondary)',
                                                    maxWidth: 200, display: 'block',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                }} title={text}>
                                                    {text}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 700, color: 'var(--accent-light)' }}>
                                                ${parseFloat(r.reward || 0).toFixed(2)}
                                            </td>
                                            <td title={r._errors.join('; ')}>
                                                {hasError
                                                    ? <AlertCircle size={16} color="var(--danger)" />
                                                    : <CheckCircle size={16} color="var(--success)" />
                                                }
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Error detail list */}
                    {invalidRows.length > 0 && (
                        <div style={{
                            marginBottom: 16, borderRadius: 10,
                            border: '1px solid rgba(239,68,68,0.25)',
                            overflow: 'hidden'
                        }}>
                            <button
                                onClick={() => setShowFailures(v => !v)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center',
                                    gap: 8, padding: '10px 14px',
                                    background: 'rgba(239,68,68,0.06)',
                                    border: 'none', cursor: 'pointer',
                                    color: 'var(--danger)', fontWeight: 600, fontSize: 13
                                }}
                            >
                                <XCircle size={15} />
                                {invalidRows.length} row{invalidRows.length > 1 ? 's' : ''} with validation errors (will be skipped)
                                {showFailures
                                    ? <ChevronUp size={15} style={{ marginLeft: 'auto' }} />
                                    : <ChevronDown size={15} style={{ marginLeft: 'auto' }} />
                                }
                            </button>
                            {showFailures && (
                                <ul style={{ padding: '10px 16px', margin: 0, listStyle: 'none' }}>
                                    {invalidRows.map(r => (
                                        <li key={r._rowNum} style={{
                                            fontSize: 12, padding: '4px 0',
                                            color: 'var(--text-secondary)',
                                            borderBottom: '1px solid var(--border)'
                                        }}>
                                            <strong style={{ color: 'var(--danger)' }}>Row {r._rowNum}:</strong>{' '}
                                            {r._errors.join('; ')}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* Upload CTA */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleUpload}
                            disabled={uploading || validRows.length === 0}
                        >
                            <UploadCloud size={17} />
                            {uploading
                                ? 'Uploading...'
                                : `Upload ${validRows.length} Valid Task${validRows.length !== 1 ? 's' : ''}`
                            }
                        </button>
                        <button className="btn btn-secondary" onClick={clearFile} disabled={uploading}>
                            <Trash2 size={15} />
                            Clear
                        </button>
                    </div>
                </>
            )}

            {/* ── Upload result summary ── */}
            {result && (
                <div style={{ animation: 'fadeIn 0.4s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                        <div style={{
                            padding: '20px', borderRadius: 12,
                            background: 'rgba(16,185,129,0.08)',
                            border: '1px solid rgba(16,185,129,0.25)',
                            textAlign: 'center'
                        }}>
                            <CheckCircle size={28} color="var(--success)" style={{ marginBottom: 8 }} />
                            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>{result.created}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Tasks Created</div>
                        </div>
                        <div style={{
                            padding: '20px', borderRadius: 12,
                            background: result.failed > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(100,116,139,0.08)',
                            border: `1px solid ${result.failed > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(100,116,139,0.15)'}`,
                            textAlign: 'center'
                        }}>
                            <XCircle size={28} color={result.failed > 0 ? 'var(--danger)' : 'var(--text-muted)'} style={{ marginBottom: 8 }} />
                            <div style={{ fontSize: 36, fontWeight: 800, color: result.failed > 0 ? 'var(--danger)' : 'var(--text-muted)', lineHeight: 1 }}>{result.failed}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Rows Failed</div>
                        </div>
                    </div>

                    {result.createdTasks?.length > 0 && (
                        <div className="card" style={{ marginBottom: 16, padding: '16px' }}>
                            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--success)' }}>
                                ✅ Created Tasks
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {result.createdTasks.map(t => (
                                    <span key={t.id} style={{
                                        fontSize: 12, padding: '4px 10px', borderRadius: 20,
                                        background: 'rgba(16,185,129,0.1)',
                                        border: '1px solid rgba(16,185,129,0.2)',
                                        color: 'var(--success)'
                                    }}>
                                        #{t.id} · {t.type} · ${parseFloat(t.reward).toFixed(2)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {result.failedRows?.length > 0 && (
                        <div className="card" style={{ marginBottom: 16, padding: '16px', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--danger)' }}>
                                ❌ Failed Rows
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {result.failedRows.map((f, i) => (
                                    <li key={i} style={{ fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                        <strong style={{ color: 'var(--danger)' }}>Row {f.row}:</strong> {f.errors.join('; ')}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <button className="btn btn-secondary" onClick={clearFile}>
                        <UploadCloud size={15} />
                        Upload Another File
                    </button>
                </div>
            )}
        </div>
    );
}
