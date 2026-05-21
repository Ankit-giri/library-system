import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';
import { formatDate, formatDateTime } from '../utils/formatDate';
import './MyBookingsPage.css';

/* ── Constants ───────────────────────────────── */
const FILTERS = [
    { id: 'ALL',       label: 'All'       },
    { id: 'UPCOMING',  label: 'Upcoming'  },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'CANCELLED', label: 'Cancelled' },
];

const SLOT_META = {
    MORNING:   { label: 'Morning',   time: '9:00 AM – 12:00 PM', startHour: 9  },
    AFTERNOON: { label: 'Afternoon', time: '12:00 PM – 3:00 PM', startHour: 12 },
    EVENING:   { label: 'Evening',   time: '3:00 PM – 6:00 PM',  startHour: 15 },
};

const PAGE_SIZE = 10;

/* ── Helpers ─────────────────────────────────── */
function slotStartDate(date, timeSlot) {
    const d = new Date(date);
    d.setHours(SLOT_META[timeSlot]?.startHour ?? 9, 0, 0, 0);
    return d;
}

function canCancel(booking) {
    if (booking.status !== 'CONFIRMED') return false;
    return slotStartDate(booking.date, booking.timeSlot) - Date.now() > 60 * 60 * 1000;
}

function isPastWindow(booking) {
    if (booking.status !== 'CONFIRMED') return false;
    const diff = slotStartDate(booking.date, booking.timeSlot) - Date.now();
    return diff > 0 && diff <= 60 * 60 * 1000;
}

function isFuture(booking) {
    if (booking.status !== 'CONFIRMED') return false;
    const d = new Date(booking.date);
    d.setHours(23, 59, 59, 999);
    return d >= Date.now();
}

function pageRange(current, total) {
    const delta = 2;
    const lo = Math.max(0, current - delta);
    const hi = Math.min(total - 1, current + delta);
    const inner = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const out = [];
    if (lo > 0) { out.push(0); if (lo > 1) out.push('…'); }
    out.push(...inner);
    if (hi < total - 1) { if (hi < total - 2) out.push('…'); out.push(total - 1); }
    return out;
}

/* ── Status Badge ────────────────────────────── */
function StatusBadge({ status }) {
    const cfg = {
        CONFIRMED: { cls: 'mb-badge--green', text: 'Confirmed' },
        COMPLETED: { cls: 'mb-badge--grey',  text: 'Completed' },
        CANCELLED: { cls: 'mb-badge--red',   text: 'Cancelled' },
        PENDING:   { cls: 'mb-badge--amber', text: 'Pending'   },
    };
    const { cls = 'mb-badge--grey', text = status } = cfg[status] ?? {};
    return <span className={`mb-badge ${cls}`}>{text}</span>;
}

/* ── Skeleton Row ────────────────────────────── */
function SkelRow() {
    return (
        <tr aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
                <td key={i}><div className="mb-skel" /></td>
            ))}
        </tr>
    );
}

/* ── Cancel Modal ────────────────────────────── */
function CancelModal({ booking, windowPassed, cancelling, onClose, onConfirm }) {
    const slot = SLOT_META[booking.timeSlot];

    return (
        <div
            className="mb-backdrop"
            onClick={e => e.target === e.currentTarget && !cancelling && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
        >
            <div className="mb-modal">
                <button className="mb-modal__x" onClick={onClose} disabled={cancelling} aria-label="Close">✕</button>

                {windowPassed ? (
                    <>
                        <span className="mb-modal__icon">⏰</span>
                        <h3 className="mb-modal__title" id="cancel-title">Cancellation Window Passed</h3>
                        <p className="mb-modal__body">
                            Bookings can only be cancelled more than 1 hour before the slot begins.
                            Your booking for <strong>Seat {booking.seatNumber}</strong> starts soon and can no longer be cancelled.
                        </p>
                        <div className="mb-modal__foot">
                            <button className="mb-btn mb-btn--primary" onClick={onClose}>Got It</button>
                        </div>
                    </>
                ) : (
                    <>
                        <span className="mb-modal__icon">🗑️</span>
                        <h3 className="mb-modal__title" id="cancel-title">Cancel Booking?</h3>
                        <p className="mb-modal__body">
                            Cancel your booking for <strong>Seat {booking.seatNumber}</strong> on{' '}
                            <strong>{formatDate(booking.date)}</strong>
                            {slot ? ` · ${slot.label}` : ''}?
                            This cannot be undone.
                        </p>
                        <div className="mb-modal__foot">
                            <button className="mb-btn mb-btn--ghost" onClick={onClose} disabled={cancelling}>
                                Keep Booking
                            </button>
                            <button className="mb-btn mb-btn--danger" onClick={onConfirm} disabled={cancelling}>
                                {cancelling ? (
                                    <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Cancelling…</>
                                ) : 'Yes, Cancel'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ── Detail Modal ────────────────────────────── */
function DetailModal({ booking, onClose }) {
    const slot = SLOT_META[booking.timeSlot];
    const floorSection = booking.zone === 'Computers' ? 'First Floor · Tech Wing' :
                         booking.zone === 'Group'     ? 'Ground Floor · Section B' :
                                                        'Ground Floor · Section A';
    /* Mini seat map — highlights cell 11 as "your seat" */
    const TOTAL_CELLS = 24;
    const highlightIdx = 11;

    return (
        <div
            className="mb-backdrop"
            onClick={e => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
        >
            <div className="mb-modal mb-modal--detail">
                <button className="mb-modal__x" onClick={onClose} aria-label="Close">✕</button>

                <div className="mb-detail-head">
                    <div>
                        <span className="mb-detail-id">Booking #{booking.id ?? '—'}</span>
                        <h3 className="mb-modal__title" id="detail-title">
                            Seat {booking.seatNumber}
                        </h3>
                    </div>
                    <StatusBadge status={booking.status} />
                </div>

                <div className="mb-detail-grid">
                    {[
                        { label: 'Zone',      value: booking.zone },
                        { label: 'Date',      value: formatDate(booking.date) },
                        { label: 'Time Slot', value: <>{slot?.label ?? booking.timeSlot}<br /><small className="text-muted">{slot?.time}</small></> },
                        { label: 'Duration',  value: '3 hours' },
                        { label: 'Booked On', value: booking.createdAt ? formatDateTime(booking.createdAt) : '—' },
                        { label: 'Location',  value: floorSection },
                    ].map(({ label, value }) => (
                        <div className="mb-detail-item" key={label}>
                            <span className="mb-detail-item__label">{label}</span>
                            <span className="mb-detail-item__value">{value}</span>
                        </div>
                    ))}
                </div>

                {/* Mini floor plan */}
                <div className="mb-floor">
                    <p className="mb-floor__title">📍 Floor Plan</p>
                    <div className="mb-floor__map" aria-label="Simplified floor plan showing your seat location">
                        {Array.from({ length: TOTAL_CELLS }, (_, i) => (
                            <div
                                key={i}
                                className={`mb-floor__cell${i === highlightIdx ? ' mb-floor__cell--you' : ''}`}
                                title={i === highlightIdx ? `Your seat: ${booking.seatNumber}` : undefined}
                            />
                        ))}
                    </div>
                    <p className="mb-floor__caption">
                        <span className="mb-floor__legend-dot" /> Your seat ({booking.seatNumber})
                    </p>
                </div>

                <div className="mb-modal__foot">
                    <button className="mb-btn mb-btn--ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

/* ── Main Component ──────────────────────────── */
function MyBookingsPage() {
    const [bookings, setBookings]         = useState([]);
    const [totalPages, setTotalPages]     = useState(0);
    const [totalElements, setTotal]       = useState(0);
    const [loading, setLoading]           = useState(true);
    const [filter, setFilter]             = useState('ALL');
    const [search, setSearch]             = useState('');
    const [debSearch, setDebSearch]       = useState('');
    const [page, setPage]                 = useState(0);
    const [cancelling, setCancelling]     = useState(false);
    const [cancelState, setCancelState]   = useState(null); // { booking, windowPassed }
    const [detailBooking, setDetail]      = useState(null);

    /* Debounce search 320 ms */
    useEffect(() => {
        const t = setTimeout(() => setDebSearch(search), 320);
        return () => clearTimeout(t);
    }, [search]);

    /* Reset page when filter / search changes */
    useEffect(() => { setPage(0); }, [filter, debSearch]);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, size: PAGE_SIZE });
            if (filter === 'UPCOMING')      params.set('status', 'CONFIRMED');
            else if (filter !== 'ALL')      params.set('status', filter);
            if (debSearch.trim())           params.set('search', debSearch.trim());

            const { data } = await api.get(`/api/bookings/my?${params}`);
            setBookings(data.content ?? data ?? []);
            setTotalPages(data.totalPages ?? 1);
            setTotal(data.totalElements ?? (Array.isArray(data) ? data.length : 0));
        } catch {
            toast.error('Failed to load bookings.');
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }, [filter, page, debSearch]);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const openCancel = (booking) =>
        setCancelState({ booking, windowPassed: isFuture(booking) && !canCancel(booking) });

    const handleCancel = async () => {
        if (!cancelState) return;
        setCancelling(true);
        try {
            await api.put(`/api/bookings/${cancelState.booking.id}/cancel`);
            toast.success('Booking cancelled successfully.');
            setCancelState(null);
            fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Failed to cancel booking.');
        } finally {
            setCancelling(false);
        }
    };

    const from = page * PAGE_SIZE + 1;
    const to   = Math.min((page + 1) * PAGE_SIZE, totalElements);
    const pgs  = pageRange(page, totalPages);

    return (
        <div className="mb-page">
            <PageHeader
                title="My Bookings"
                subtitle="View and manage your seat reservations"
                breadcrumbs={[
                    { label: 'Dashboard', to: '/dashboard' },
                    { label: 'My Bookings' },
                ]}
                actions={
                    <Link to="/seat-booking" className="mb-book-btn">+ Book a Seat</Link>
                }
            />

            {/* ── Filter + Search ──────────────────── */}
            <div className="mb-toolbar mb-card mb-4">
                <div className="mb-tabs" role="tablist" aria-label="Booking filter">
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            type="button"
                            role="tab"
                            aria-selected={filter === f.id}
                            className={`mb-tab${filter === f.id ? ' mb-tab--active' : ''}`}
                            onClick={() => setFilter(f.id)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="mb-search-wrap">
                    <span className="mb-search-icon" aria-hidden="true">🔍</span>
                    <input
                        type="text"
                        className="mb-search"
                        placeholder="Search seat or date…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        aria-label="Search bookings"
                    />
                    {search && (
                        <button
                            className="mb-search-clear"
                            onClick={() => setSearch('')}
                            aria-label="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* ── Table Card ───────────────────────── */}
            <div className="mb-card">
                {!loading && totalElements > 0 && (
                    <p className="mb-range-label">
                        Showing <strong>{from}–{to}</strong> of <strong>{totalElements}</strong> booking{totalElements !== 1 ? 's' : ''}
                    </p>
                )}

                <div className="table-responsive">
                    <table className="table mb-table" aria-label="My bookings">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Seat</th>
                                <th>Zone</th>
                                <th>Date</th>
                                <th>Time Slot</th>
                                <th>Status</th>
                                <th>Booked On</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }, (_, i) => <SkelRow key={i} />)
                            ) : bookings.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="mb-empty-td">
                                        <div className="mb-empty">
                                            <span className="mb-empty__icon">📋</span>
                                            <p className="mb-empty__title">
                                                {search || filter !== 'ALL'
                                                    ? 'No bookings match your filters'
                                                    : 'No bookings yet'}
                                            </p>
                                            <p className="mb-empty__sub">
                                                {search || filter !== 'ALL'
                                                    ? 'Try adjusting your search or switching the filter tab.'
                                                    : 'Reserve a seat to get started.'}
                                            </p>
                                            {!search && filter === 'ALL' && (
                                                <Link to="/seat-booking" className="mb-btn mb-btn--primary mt-3 d-inline-flex">
                                                    Book Your First Seat →
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((b, idx) => {
                                    const slot     = SLOT_META[b.timeSlot];
                                    const future   = isFuture(b);
                                    const pastWin  = isPastWindow(b);

                                    return (
                                        <tr key={b.id} className={future ? 'mb-row--upcoming' : ''}>
                                            <td className="mb-table__idx">
                                                {page * PAGE_SIZE + idx + 1}
                                            </td>
                                            <td>
                                                <span className="mb-seat-num">{b.seatNumber}</span>
                                            </td>
                                            <td>
                                                <span className="mb-zone-chip">{b.zone}</span>
                                            </td>
                                            <td className="mb-table__date">
                                                {formatDate(b.date)}
                                            </td>
                                            <td>
                                                <span className="mb-slot-name">
                                                    {slot?.label ?? b.timeSlot}
                                                </span>
                                                <span className="mb-slot-time">{slot?.time}</span>
                                            </td>
                                            <td>
                                                <StatusBadge status={b.status} />
                                            </td>
                                            <td className="mb-table__date">
                                                {b.createdAt ? formatDate(b.createdAt) : '—'}
                                            </td>
                                            <td>
                                                <div className="mb-act-group">
                                                    {future ? (
                                                        <button
                                                            className={`mb-btn mb-btn--cancel${pastWin ? ' mb-btn--cancel-dim' : ''}`}
                                                            onClick={() => openCancel(b)}
                                                            title={pastWin ? 'Cancellation window closing soon' : undefined}
                                                        >
                                                            Cancel
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="mb-btn mb-btn--detail"
                                                            onClick={() => setDetail(b)}
                                                        >
                                                            Details
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ───────────────────── */}
                {!loading && totalPages > 1 && (
                    <div className="mb-pagination">
                        <nav aria-label="Page navigation">
                            <ul className="pagination pagination-sm justify-content-center mb-0">
                                <li className={`page-item${page === 0 ? ' disabled' : ''}`}>
                                    <button
                                        className="page-link"
                                        onClick={() => setPage(p => p - 1)}
                                        disabled={page === 0}
                                        aria-label="Previous"
                                    >
                                        ‹
                                    </button>
                                </li>

                                {pgs.map((p, i) =>
                                    p === '…' ? (
                                        <li key={`e${i}`} className="page-item disabled">
                                            <span className="page-link mb-ellipsis">…</span>
                                        </li>
                                    ) : (
                                        <li key={p} className={`page-item${p === page ? ' active' : ''}`}>
                                            <button
                                                className="page-link"
                                                onClick={() => setPage(p)}
                                                aria-current={p === page ? 'page' : undefined}
                                            >
                                                {p + 1}
                                            </button>
                                        </li>
                                    )
                                )}

                                <li className={`page-item${page >= totalPages - 1 ? ' disabled' : ''}`}>
                                    <button
                                        className="page-link"
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= totalPages - 1}
                                        aria-label="Next"
                                    >
                                        ›
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            {/* ── Modals ───────────────────────────── */}
            {cancelState && (
                <CancelModal
                    booking={cancelState.booking}
                    windowPassed={cancelState.windowPassed}
                    cancelling={cancelling}
                    onClose={() => !cancelling && setCancelState(null)}
                    onConfirm={handleCancel}
                />
            )}

            {detailBooking && (
                <DetailModal
                    booking={detailBooking}
                    onClose={() => setDetail(null)}
                />
            )}
        </div>
    );
}

export default MyBookingsPage;
