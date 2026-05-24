import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }) {
    const map = { SENT: 'success', PENDING: 'warning', FAILED: 'danger' };
    return <span className={`badge bg-${map[status] ?? 'secondary'}`}>{status}</span>;
}

export default function AdminEmailPage() {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchEmails = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/api/admin/emails');
            setEmails(Array.isArray(data) ? data : data.content ?? []);
        } catch {
            setError('Failed to load email logs.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEmails(); }, [fetchEmails]);

    return (
        <div className="p-4">
            <div className="mb-4">
                <h1 className="h4 mb-1">Email Center</h1>
                <p className="text-muted small mb-0">Outbound email log from the notification service</p>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2">
                    {error}
                    <button className="btn btn-sm btn-outline-danger ms-auto" onClick={fetchEmails}>Retry</button>
                </div>
            )}

            <div className="card border-0 shadow-sm">
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>#</th>
                                <th>To</th>
                                <th>Subject</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Sent At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading
                                ? Array.from({ length: 6 }, (_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 6 }, (_, j) => (
                                            <td key={j}><div className="placeholder-glow"><span className="placeholder col-8" /></div></td>
                                        ))}
                                    </tr>
                                ))
                                : emails.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-5 text-muted">
                                                <div style={{ fontSize: '2rem' }}>📭</div>
                                                <div>No emails sent yet</div>
                                            </td>
                                        </tr>
                                    )
                                    : emails.map((e, i) => (
                                        <tr key={e.id ?? i}>
                                            <td className="text-muted small">{i + 1}</td>
                                            <td className="small">{e.toEmail ?? e.recipient ?? '—'}</td>
                                            <td className="small">{e.subject ?? '—'}</td>
                                            <td className="small text-muted">{e.type ?? e.notificationType ?? '—'}</td>
                                            <td><StatusBadge status={e.status ?? 'SENT'} /></td>
                                            <td className="small text-muted">{formatDate(e.sentAt ?? e.createdAt)}</td>
                                        </tr>
                                    ))
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
