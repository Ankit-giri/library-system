import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import './AdminStudentsPage.css';

const PAGE_SIZE = 10;

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(iso) {
    if (!iso) return null;
    const diff = new Date(iso).setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
    return Math.ceil(diff / 86_400_000);
}

function MembershipChip({ status, expiry }) {
    const days = daysUntil(expiry);
    let cls = 'as-chip';
    let label = status;
    if (status === 'ACTIVE') {
        if (days !== null && days <= 7) { cls += ' as-chip--warn'; label = 'Expiring Soon'; }
        else cls += ' as-chip--active';
    } else {
        cls += ' as-chip--expired';
    }
    return <span className={cls}>{label}</span>;
}

function SkeletonRow() {
    return (
        <tr className="as-skel-row">
            {Array.from({ length: 7 }, (_, i) => (
                <td key={i}><div className="as-skel" /></td>
            ))}
        </tr>
    );
}

function pageRange(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    if (current <= 3) return [0, 1, 2, 3, '…', total - 1];
    if (current >= total - 4) return [0, '…', total - 4, total - 3, total - 2, total - 1];
    return [0, '…', current - 1, current, current + 1, '…', total - 1];
}

/* ── Delete confirm modal ────────────────── */
function DeleteModal({ student, onConfirm, onClose, loading }) {
    return (
        <div className="as-modal-backdrop" onClick={onClose}>
            <div className="as-modal as-modal--sm" onClick={e => e.stopPropagation()}>
                <div className="as-modal__hd">
                    <h5 className="as-modal__title">Delete Student</h5>
                    <button className="as-modal__close" onClick={onClose}>✕</button>
                </div>
                <div className="as-modal__body">
                    <div className="as-delete-icon">⚠️</div>
                    <p className="as-modal__text">
                        Are you sure you want to delete <strong>{student.name}</strong> ({student.studentId})?
                        This will permanently remove all their bookings and payment records.
                    </p>
                </div>
                <div className="as-modal__ft">
                    <button className="as-btn as-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className="as-btn as-btn--danger" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Student detail modal ────────────────── */
function DetailModal({ student, onClose }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/api/admin/students/${student.id}`)
            .then(r => setDetail(r.data))
            .catch(() => setDetail({ ...student, bookings: [], payments: [] }))
            .finally(() => setLoading(false));
    }, [student.id]);

    return (
        <div className="as-modal-backdrop" onClick={onClose}>
            <div className="as-modal as-modal--lg" onClick={e => e.stopPropagation()}>
                <div className="as-modal__hd">
                    <div className="as-modal__hd-avatar">{student.name?.[0]?.toUpperCase()}</div>
                    <div>
                        <h5 className="as-modal__title">{student.name}</h5>
                        <p className="as-modal__subtitle">{student.studentId} · {student.email}</p>
                    </div>
                    <button className="as-modal__close" onClick={onClose}>✕</button>
                </div>

                {loading
                    ? <div className="as-modal__body as-modal__body--loading">
                        <div className="as-spinner" />
                      </div>
                    : (
                        <div className="as-modal__body as-modal__scroll">
                            <div className="as-detail-grid">
                                <div className="as-detail-item">
                                    <span className="as-detail-label">Student ID</span>
                                    <span className="as-detail-value">{detail.studentId}</span>
                                </div>
                                <div className="as-detail-item">
                                    <span className="as-detail-label">Email</span>
                                    <span className="as-detail-value">{detail.email}</span>
                                </div>
                                <div className="as-detail-item">
                                    <span className="as-detail-label">Plan</span>
                                    <span className="as-detail-value">{detail.membershipPlan || '—'}</span>
                                </div>
                                <div className="as-detail-item">
                                    <span className="as-detail-label">Status</span>
                                    <span className="as-detail-value"><MembershipChip status={detail.membershipStatus} expiry={detail.membershipExpiry} /></span>
                                </div>
                                <div className="as-detail-item">
                                    <span className="as-detail-label">Expiry Date</span>
                                    <span className="as-detail-value">{formatDate(detail.membershipExpiry)}</span>
                                </div>
                                <div className="as-detail-item">
                                    <span className="as-detail-label">Total Bookings</span>
                                    <span className="as-detail-value">{detail.bookingsCount ?? (detail.bookings?.length ?? '—')}</span>
                                </div>
                                <div className="as-detail-item">
                                    <span className="as-detail-label">Joined</span>
                                    <span className="as-detail-value">{formatDate(detail.createdAt)}</span>
                                </div>
                                <div className="as-detail-item">
                                    <span className="as-detail-label">Account Status</span>
                                    <span className="as-detail-value">
                                        <span className={`as-chip ${detail.active ? 'as-chip--active' : 'as-chip--expired'}`}>
                                            {detail.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {detail.bookings?.length > 0 && (
                                <>
                                    <p className="as-section-label">Recent Bookings</p>
                                    <div className="table-responsive">
                                        <table className="table table-sm as-inner-table mb-3">
                                            <thead><tr><th>Seat</th><th>Date</th><th>Slot</th><th>Status</th></tr></thead>
                                            <tbody>
                                                {detail.bookings.slice(0, 5).map(b => (
                                                    <tr key={b.id}>
                                                        <td>{b.seatNumber}</td>
                                                        <td>{formatDate(b.bookingDate)}</td>
                                                        <td>{b.timeSlot}</td>
                                                        <td><span className={`as-badge as-badge--${b.status?.toLowerCase()}`}>{b.status}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}

                            {detail.payments?.length > 0 && (
                                <>
                                    <p className="as-section-label">Payment History</p>
                                    <div className="table-responsive">
                                        <table className="table table-sm as-inner-table mb-0">
                                            <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th></tr></thead>
                                            <tbody>
                                                {detail.payments.slice(0, 5).map(p => (
                                                    <tr key={p.id}>
                                                        <td>{formatDate(p.date)}</td>
                                                        <td>{p.plan}</td>
                                                        <td>₹{p.amount}</td>
                                                        <td><span className={`as-badge as-badge--${p.status?.toLowerCase()}`}>{p.status}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )
                }

                <div className="as-modal__ft">
                    <button className="as-btn as-btn--ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

/* ── Main page ───────────────────────────── */
export default function AdminStudentsPage() {
    const [students, setStudents]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');
    const [search, setSearch]           = useState('');
    const [debSearch, setDebSearch]     = useState('');
    const [statusFilter, setStatus]     = useState('ALL');
    const [page, setPage]               = useState(0);
    const [totalPages, setTotalPages]   = useState(1);
    const [totalElements, setTotal]     = useState(0);
    const [detailStudent, setDetail]    = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [actionLoading, setActLoading]  = useState(null);

    /* Debounce search */
    useEffect(() => {
        const t = setTimeout(() => { setDebSearch(search); setPage(0); }, 320);
        return () => clearTimeout(t);
    }, [search]);

    /* Reset page on filter change */
    useEffect(() => { setPage(0); }, [statusFilter]);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = { page, size: PAGE_SIZE };
            if (debSearch) params.search = debSearch;
            if (statusFilter !== 'ALL') params.status = statusFilter;
            const { data } = await api.get('/api/admin/students', { params });
            setStudents(data.content ?? data ?? []);
            setTotalPages(data.totalPages ?? 1);
            setTotal(data.totalElements ?? (data.length ?? 0));
        } catch {
            setError('Failed to load students.');
        } finally {
            setLoading(false);
        }
    }, [page, debSearch, statusFilter]);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    const handleToggleStatus = async (student) => {
        const newActive = !student.active;
        if (!newActive && !window.confirm(`Deactivate ${student.name}? They won't be able to log in.`)) return;
        setActLoading(student.id);
        try {
            await api.put(`/api/admin/students/${student.id}/status`, { active: newActive });
            toast.success(`${student.name} ${newActive ? 'activated' : 'deactivated'}.`);
            fetchStudents();
        } catch {
            toast.error('Failed to update status.');
        } finally {
            setActLoading(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setActLoading(deleteTarget.id);
        try {
            await api.delete(`/api/admin/students/${deleteTarget.id}`);
            toast.success(`${deleteTarget.name} deleted.`);
            setDeleteTarget(null);
            fetchStudents();
        } catch {
            toast.error('Failed to delete student.');
        } finally {
            setActLoading(null);
        }
    };

    const range = pageRange(page, totalPages);

    return (
        <div className="as-root">
            <div className="as-page-hd">
                <div>
                    <h1 className="as-page-hd__title">Students</h1>
                    <p className="as-page-hd__sub">{totalElements} registered members</p>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="as-filters">
                <div className="as-search-wrap">
                    <svg className="as-search-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                    </svg>
                    <input
                        type="text"
                        className="as-search"
                        placeholder="Search by name, ID, or email…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="as-search-clear" onClick={() => setSearch('')}>✕</button>
                    )}
                </div>

                <div className="as-filter-pills">
                    {['ALL', 'ACTIVE', 'INACTIVE'].map(f => (
                        <button
                            key={f}
                            className={`as-pill${statusFilter === f ? ' as-pill--active' : ''}`}
                            onClick={() => setStatus(f)}
                        >
                            {f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="as-error-bar">
                    {error} <button onClick={fetchStudents}>Retry</button>
                </div>
            )}

            {/* ── Table ── */}
            <div className="as-card">
                <div className="table-responsive">
                    <table className="table table-hover mb-0 as-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Student</th>
                                <th>Email</th>
                                <th>Membership</th>
                                <th>Expiry</th>
                                <th>Bookings</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading
                                ? Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)
                                : students.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={7}>
                                                <div className="as-empty">
                                                    <div className="as-empty__icon">👤</div>
                                                    <p className="as-empty__title">No students found</p>
                                                    <p className="as-empty__sub">Try adjusting your search or filter.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                    : students.map((s, idx) => (
                                        <tr key={s.id}>
                                            <td className="as-cell-num">{page * PAGE_SIZE + idx + 1}</td>
                                            <td>
                                                <div className="as-student-cell">
                                                    <div className="as-student-avatar">{s.name?.[0]?.toUpperCase()}</div>
                                                    <div>
                                                        <div className="as-cell-primary">{s.name}</div>
                                                        <div className="as-cell-sub">{s.studentId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="as-cell-email">{s.email}</td>
                                            <td><MembershipChip status={s.membershipStatus} expiry={s.membershipExpiry} /></td>
                                            <td>{formatDate(s.membershipExpiry)}</td>
                                            <td><span className="as-count-badge">{s.bookingsCount ?? '—'}</span></td>
                                            <td>
                                                <div className="as-actions">
                                                    <button
                                                        className="as-action-btn as-action-btn--view"
                                                        onClick={() => setDetail(s)}
                                                        title="View Details"
                                                    >
                                                        Details
                                                    </button>
                                                    <button
                                                        className={`as-action-btn ${s.active ? 'as-action-btn--deactivate' : 'as-action-btn--activate'}`}
                                                        onClick={() => handleToggleStatus(s)}
                                                        disabled={actionLoading === s.id}
                                                        title={s.active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {actionLoading === s.id ? '…' : s.active ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                    <button
                                                        className="as-action-btn as-action-btn--delete"
                                                        onClick={() => setDeleteTarget(s)}
                                                        disabled={actionLoading === s.id}
                                                        title="Delete"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                            }
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div className="as-pagination">
                        <p className="as-pagination__info">
                            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
                        </p>
                        <ul className="pagination mb-0">
                            <li className={`page-item${page === 0 ? ' disabled' : ''}`}>
                                <button className="page-link" onClick={() => setPage(p => p - 1)}>‹</button>
                            </li>
                            {range.map((r, i) => (
                                r === '…'
                                    ? <li key={`e${i}`} className="page-item disabled"><span className="page-link">…</span></li>
                                    : <li key={r} className={`page-item${r === page ? ' active' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(r)}>{r + 1}</button>
                                      </li>
                            ))}
                            <li className={`page-item${page >= totalPages - 1 ? ' disabled' : ''}`}>
                                <button className="page-link" onClick={() => setPage(p => p + 1)}>›</button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {detailStudent && (
                <DetailModal student={detailStudent} onClose={() => setDetail(null)} />
            )}

            {deleteTarget && (
                <DeleteModal
                    student={deleteTarget}
                    onConfirm={handleDelete}
                    onClose={() => setDeleteTarget(null)}
                    loading={actionLoading === deleteTarget.id}
                />
            )}
        </div>
    );
}
