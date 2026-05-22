import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import './AdminBookingsPage.css';

const PAGE_SIZE = 10;
// ISSUE-27 fix: BookingStatus enum value is 'ACTIVE', not 'CONFIRMED'
const STATUSES  = ['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

const SLOT_TIMES = {
    MORNING:   '9 AM – 12 PM',
    AFTERNOON: '12 PM – 3 PM',
    EVENING:   '3 PM – 6 PM',
};

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const BADGE_CLS = {
    ACTIVE:    'ab-badge--confirmed',
    COMPLETED: 'ab-badge--completed',
    CANCELLED: 'ab-badge--cancelled',
};

function StatusBadge({ status }) {
    return <span className={`ab-badge ${BADGE_CLS[status] || 'ab-badge--confirmed'}`}>{status}</span>;
}

function SkeletonRow() {
    return (
        <tr className="ab-skel-row">
            {Array.from({ length: 8 }, (_, i) => (
                <td key={i}><div className="ab-skel" /></td>
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

/* ── Cancel confirm modal ────────────────── */
function CancelModal({ booking, onConfirm, onClose, loading }) {
    return (
        <div className="ab-modal-backdrop" onClick={onClose}>
            <div className="ab-modal ab-modal--sm" onClick={e => e.stopPropagation()}>
                <div className="ab-modal__hd">
                    <h5 className="ab-modal__title">Cancel Booking</h5>
                    <button className="ab-modal__close" onClick={onClose}>✕</button>
                </div>
                <div className="ab-modal__body">
                    <div className="ab-cancel-icon">⚠️</div>
                    <p className="ab-modal__text">
                        Cancel booking <strong>#{booking.id}</strong> for{' '}
                        <strong>{booking.studentName}</strong>?
                    </p>
                    <div className="ab-cancel-details">
                        <div className="ab-cancel-details__row">
                            <span>Seat</span><strong>{booking.seatNumber} ({booking.zone})</strong>
                        </div>
                        <div className="ab-cancel-details__row">
                            {/* ISSUE-29 fix: field is bookingDate */}
                            <span>Date</span><strong>{formatDate(booking.bookingDate)}</strong>
                        </div>
                        <div className="ab-cancel-details__row">
                            <span>Slot</span><strong>{SLOT_TIMES[booking.timeSlot] ?? booking.timeSlot}</strong>
                        </div>
                    </div>
                    <p className="ab-cancel-note">Admin cancellations bypass the standard 1-hour window.</p>
                </div>
                <div className="ab-modal__ft">
                    <button className="ab-btn ab-btn--ghost" onClick={onClose} disabled={loading}>Keep</button>
                    <button className="ab-btn ab-btn--danger" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Cancelling…' : 'Cancel Booking'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Detail modal ────────────────────────── */
function DetailModal({ booking, onClose }) {
    return (
        <div className="ab-modal-backdrop" onClick={onClose}>
            <div className="ab-modal ab-modal--md" onClick={e => e.stopPropagation()}>
                <div className="ab-modal__hd">
                    <div>
                        <h5 className="ab-modal__title">Booking #{booking.id}</h5>
                        <p className="ab-modal__subtitle">Created {formatDateTime(booking.createdAt)}</p>
                    </div>
                    <StatusBadge status={booking.status} />
                    <button className="ab-modal__close" onClick={onClose}>✕</button>
                </div>
                <div className="ab-modal__body">
                    <div className="ab-detail-grid">
                        <div className="ab-detail-section">
                            <p className="ab-detail-section__title">Student</p>
                            <div className="ab-detail-item">
                                <span>Name</span><strong>{booking.studentName}</strong>
                            </div>
                            <div className="ab-detail-item">
                                <span>Student ID</span><strong>{booking.studentId}</strong>
                            </div>
                            <div className="ab-detail-item">
                                <span>Email</span><strong>{booking.studentEmail ?? '—'}</strong>
                            </div>
                        </div>
                        <div className="ab-detail-section">
                            <p className="ab-detail-section__title">Booking</p>
                            <div className="ab-detail-item">
                                <span>Seat</span><strong>{booking.seatNumber}</strong>
                            </div>
                            <div className="ab-detail-item">
                                <span>Zone</span><strong>{booking.zone}</strong>
                            </div>
                            <div className="ab-detail-item">
                                <span>Floor</span><strong>{booking.floor ?? '—'}</strong>
                            </div>
                            <div className="ab-detail-item">
                                <span>Date</span><strong>{formatDate(booking.bookingDate)}</strong>
                            </div>
                            <div className="ab-detail-item">
                                <span>Time Slot</span><strong>{SLOT_TIMES[booking.timeSlot] ?? booking.timeSlot}</strong>
                            </div>
                            <div className="ab-detail-item">
                                <span>Booked On</span><strong>{formatDateTime(booking.createdAt)}</strong>
                            </div>
                            {booking.cancelledAt && (
                                <div className="ab-detail-item">
                                    <span>Cancelled At</span><strong>{formatDateTime(booking.cancelledAt)}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="ab-modal__ft">
                    <button className="ab-btn ab-btn--ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

/* ── Main page ───────────────────────────── */
export default function AdminBookingsPage() {
    const [bookings, setBookings]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState('');
    const [statusFilter, setStatus]       = useState('ALL');
    const [dateFrom, setDateFrom]         = useState('');
    const [dateTo, setDateTo]             = useState('');
    const [search, setSearch]             = useState('');
    const [debSearch, setDebSearch]       = useState('');
    const [page, setPage]                 = useState(0);
    const [totalPages, setTotalPages]     = useState(1);
    const [totalElements, setTotal]       = useState(0);
    const [detailBooking, setDetail]      = useState(null);
    const [cancelBooking, setCancel]      = useState(null);
    const [cancelLoading, setCancelLoad]  = useState(false);

    /* Debounce */
    useEffect(() => {
        const t = setTimeout(() => { setDebSearch(search); setPage(0); }, 320);
        return () => clearTimeout(t);
    }, [search]);

    /* Reset page on filter change */
    useEffect(() => { setPage(0); }, [statusFilter, dateFrom, dateTo]);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = { page, size: PAGE_SIZE };
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo)   params.dateTo   = dateTo;
            if (debSearch) params.search  = debSearch;
            const { data } = await api.get('/api/admin/bookings', { params });
            setBookings(data.content ?? data ?? []);
            setTotalPages(data.totalPages ?? 1);
            setTotal(data.totalElements ?? (data.length ?? 0));
        } catch {
            setError('Failed to load bookings.');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, dateFrom, dateTo, debSearch]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const handleCancel = async () => {
        if (!cancelBooking) return;
        setCancelLoad(true);
        try {
            // ISSUE-31 fix: endpoint is /override (not /cancel), requires reason body
            await api.put(`/api/admin/bookings/${cancelBooking.id}/override`, {
                reason: 'Admin cancellation',
            });
            toast.success(`Booking #${cancelBooking.id} cancelled.`);
            setCancel(null);
            fetchBookings();
        } catch {
            toast.error('Failed to cancel booking.');
        } finally {
            setCancelLoad(false);
        }
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('ALL');
        setDateFrom('');
        setDateTo('');
    };
    const hasFilters = statusFilter !== 'ALL' || dateFrom || dateTo || search;

    const range = pageRange(page, totalPages);

    return (
        <div className="ab-root">
            <div className="ab-page-hd">
                <div>
                    <h1 className="ab-page-hd__title">Bookings</h1>
                    <p className="ab-page-hd__sub">{totalElements} total bookings</p>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="ab-filters">
                {/* Status pills */}
                <div className="ab-status-pills">
                    {STATUSES.map(s => (
                        <button
                            key={s}
                            className={`ab-pill${statusFilter === s ? ' ab-pill--active' : ''}`}
                            onClick={() => setStatus(s)}
                        >
                            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>

                {/* Search + date range */}
                <div className="ab-filter-row">
                    <div className="ab-search-wrap">
                        <svg className="ab-search-icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                        </svg>
                        <input
                            type="text"
                            className="ab-search"
                            placeholder="Search student, seat, booking ID…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="ab-date-range">
                        <input
                            type="date"
                            className="ab-date-input"
                            value={dateFrom}
                            max={dateTo || undefined}
                            onChange={e => setDateFrom(e.target.value)}
                            title="From date"
                        />
                        <span className="ab-date-sep">–</span>
                        <input
                            type="date"
                            className="ab-date-input"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={e => setDateTo(e.target.value)}
                            title="To date"
                        />
                    </div>
                    {hasFilters && (
                        <button className="ab-clear-btn" onClick={clearFilters}>Clear</button>
                    )}
                </div>
            </div>

            {error && (
                <div className="ab-error-bar">
                    {error} <button onClick={fetchBookings}>Retry</button>
                </div>
            )}

            {/* ── Table ── */}
            <div className="ab-card">
                <div className="table-responsive">
                    <table className="table table-hover mb-0 ab-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Student</th>
                                <th>Seat</th>
                                <th>Date</th>
                                <th>Slot</th>
                                <th>Status</th>
                                <th className="ab-col-booked">Booked On</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading
                                ? Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} />)
                                : bookings.length === 0
                                    ? (
                                        <tr>
                                            <td colSpan={8}>
                                                <div className="ab-empty">
                                                    <div className="ab-empty__icon">📋</div>
                                                    <p className="ab-empty__title">No bookings found</p>
                                                    <p className="ab-empty__sub">Try adjusting your filters.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                    : bookings.map((b, idx) => (
                                        <tr key={b.id}>
                                            <td className="ab-cell-num">{page * PAGE_SIZE + idx + 1}</td>
                                            <td>
                                                <div className="ab-cell-primary">{b.studentName}</div>
                                                <div className="ab-cell-sub">{b.studentId}</div>
                                            </td>
                                            <td>
                                                <div className="ab-cell-primary">{b.seatNumber}</div>
                                                <div className="ab-cell-sub">{b.zone}</div>
                                            </td>
                                            {/* ISSUE-30 fix: field is bookingDate */}
                                            <td>{formatDate(b.bookingDate)}</td>
                                            <td>
                                                <div className="ab-slot-chip">{SLOT_TIMES[b.timeSlot] ?? b.timeSlot}</div>
                                            </td>
                                            <td><StatusBadge status={b.status} /></td>
                                            <td className="ab-col-booked ab-cell-sub">{formatDate(b.createdAt)}</td>
                                            <td>
                                                <div className="ab-actions">
                                                    <button
                                                        className="ab-action-btn ab-action-btn--view"
                                                        onClick={() => setDetail(b)}
                                                    >
                                                        Details
                                                    </button>
                                                    {/* ISSUE-28 fix: BookingStatus enum value is ACTIVE */}
                                                    {b.status === 'ACTIVE' && (
                                                        <button
                                                            className="ab-action-btn ab-action-btn--cancel"
                                                            onClick={() => setCancel(b)}
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                            }
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="ab-pagination">
                        <p className="ab-pagination__info">
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

            {detailBooking && (
                <DetailModal booking={detailBooking} onClose={() => setDetail(null)} />
            )}

            {cancelBooking && (
                <CancelModal
                    booking={cancelBooking}
                    onConfirm={handleCancel}
                    onClose={() => setCancel(null)}
                    loading={cancelLoading}
                />
            )}
        </div>
    );
}
