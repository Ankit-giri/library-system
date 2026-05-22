import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';
import { formatDate, formatRelativeDay } from '../utils/formatDate';
import './StudentDashboard.css';

/* ── Helpers ─────────────────────────────────── */
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

function daysUntilDate(isoDate) {
    if (!isoDate) return 0;
    const diff = new Date(isoDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
    return Math.ceil(diff / 86_400_000);
}

/* ── Sub-components ──────────────────────────── */
function StatusBadge({ status }) {
    const map = {
        ACTIVE:     { cls: 'db-badge--green',  text: 'Active' },
        COMPLETED:  { cls: 'db-badge--grey',   text: 'Completed' },
        CANCELLED:  { cls: 'db-badge--red',    text: 'Cancelled' },
        EXPIRED:    { cls: 'db-badge--red',    text: 'Expired' },
        PENDING:    { cls: 'db-badge--amber',  text: 'Pending' },
    };
    const { cls = 'db-badge--grey', text = status } = map[status] ?? {};
    return <span className={`db-badge ${cls}`}>{text}</span>;
}

function StatCard({ icon, label, value, sub, subClass, loading, onClick }) {
    if (loading) {
        return (
            <div className="db-stat-card">
                <div className="db-skel db-skel--circle mb-3" />
                <div className="db-skel db-skel--h2 mb-2" />
                <div className="db-skel db-skel--h1 w-75" />
            </div>
        );
    }
    return (
        <div className={`db-stat-card${onClick ? ' db-stat-card--link' : ''}`} onClick={onClick}>
            <span className="db-stat-card__icon">{icon}</span>
            <div className="db-stat-card__value">{value}</div>
            <div className="db-stat-card__label">{label}</div>
            {sub && <div className={`db-stat-card__sub ${subClass ?? ''}`}>{sub}</div>}
        </div>
    );
}

function SkeletonRows({ count = 5, cols = 6 }) {
    return Array.from({ length: count }, (_, i) => (
        <tr key={i}>
            {Array.from({ length: cols }, (_, j) => (
                <td key={j}><div className="db-skel db-skel--h1" /></td>
            ))}
        </tr>
    ));
}

/* ── Initial data shape ──────────────────────── */
const INIT = {
    totalBookings: 0,
    upcomingBookings: 0,
    membershipStatus: 'ACTIVE',
    membershipExpiryDate: null,
    recentBookings: [],
    zoneAvailability: [],
    nextBooking: null,
};

/* ── Main Component ──────────────────────────── */
function StudentDashboard() {
    const { currentUser } = useAuth();
    const [data, setData] = useState(INIT);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const studentId = currentUser?.studentId;
            // ISSUE-7 fix: /api/dashboard doesn't exist; construct from real endpoints
            // ISSUE-8 fix: /api/seats/availability requires date+slot params; use /api/seats instead
            const [bookingsRes, membershipRes, seatsRes, upcomingRes] = await Promise.all([
                api.get('/api/bookings/my?page=0&size=5'),
                studentId
                    ? api.get('/api/payments/my-membership', {
                          headers: { 'X-Student-Id': studentId },
                      })
                    : Promise.resolve({ data: null }),
                api.get('/api/seats'),
                api.get('/api/bookings/my?page=0&size=1&status=ACTIVE'),
            ]);

            const recentBookings = bookingsRes.data?.content ?? [];
            const totalBookings  = bookingsRes.data?.totalElements ?? 0;
            const membership     = membershipRes.data ?? {};

            // Build zone availability stats from the full seat list
            const allSeats = Array.isArray(seatsRes.data) ? seatsRes.data : [];
            const zoneMap  = {};
            allSeats.forEach((s) => {
                if (!zoneMap[s.zone]) zoneMap[s.zone] = { zone: s.zone, total: 0, available: 0 };
                zoneMap[s.zone].total++;
                if (s.status === 'AVAILABLE') zoneMap[s.zone].available++;
            });

            const upcomingBookings = upcomingRes.data?.totalElements ?? 0;
            const nextBooking      = recentBookings.find((b)  => b.status === 'ACTIVE') ?? null;

            // Derive membership status from the DTO fields
            let membershipStatus = 'ACTIVE';
            if (!membership.active) {
                membershipStatus = 'EXPIRED';
            } else if (
                membership.expiryDate &&
                new Date(membership.expiryDate) - new Date() < 7 * 86_400_000
            ) {
                membershipStatus = 'EXPIRING_SOON';
            }

            setData({
                totalBookings,
                upcomingBookings,
                membershipStatus,
                membershipExpiryDate: membership.expiryDate ?? null,
                recentBookings,
                zoneAvailability: Object.values(zoneMap),
                nextBooking,
            });
        } catch {
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, [currentUser?.studentId]);

    useEffect(() => { load(); }, [load]);

    // ISSUE-11 fix: currentUser stores fullName (not name)
    const firstName = currentUser?.fullName?.split(' ')[0] ?? 'Student';
    const days = daysUntilDate(data.membershipExpiryDate);
    const isExpiringSoon = !loading && days < 7;
    const isExpired = !loading && data.membershipStatus === 'EXPIRED';

    const expiryClass =
        days > 30 ? 'db-days--green' :
        days > 7  ? 'db-days--amber' : 'db-days--red';

    return (
        <div className="db-page">
            <PageHeader
                title="Dashboard"
                subtitle="Your library activity at a glance"
                breadcrumbs={[{ label: 'Dashboard' }]}
            />

            {/* ── Welcome Banner ─────────────────────── */}
            <div className={`db-welcome${isExpiringSoon || isExpired ? ' db-welcome--warn' : ''}`}>
                <div className="db-welcome__copy">
                    <h2 className="db-welcome__title">
                        {getGreeting()}, {firstName}! 👋
                    </h2>
                    {loading
                        ? <div className="db-skel db-skel--h1 mt-2" style={{ width: 260 }} />
                        : data.membershipExpiryDate
                            ? (
                                <p className="db-welcome__sub">
                                    {isExpired
                                        ? 'Your membership has expired.'
                                        : `Membership expires in ${days} day${days !== 1 ? 's' : ''} · ${formatDate(data.membershipExpiryDate)}.`}
                                </p>
                            )
                            : null
                    }
                </div>
                {(isExpiringSoon || isExpired) && (
                    <Link to="/fee-renewal" className="db-welcome__cta">
                        Renew Now →
                    </Link>
                )}
            </div>

            {/* ── Error ──────────────────────────────── */}
            {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" role="alert">
                    <span>⚠️ {error}</span>
                    <button className="btn btn-sm btn-outline-danger ms-auto" onClick={load}>
                        Retry
                    </button>
                </div>
            )}

            {/* ── Stat Cards ─────────────────────────── */}
            <div className="row g-3 mb-4">
                <div className="col-6 col-sm-6 col-lg-3">
                    <StatCard
                        loading={loading}
                        icon="📋"
                        label="Total Bookings"
                        value={data.totalBookings}
                    />
                </div>
                <div className="col-6 col-sm-6 col-lg-3">
                    <StatCard
                        loading={loading}
                        icon="🗓️"
                        label="Upcoming"
                        value={data.upcomingBookings}
                        sub={data.upcomingBookings > 0 ? 'View bookings →' : 'None scheduled'}
                        subClass={data.upcomingBookings > 0 ? 'db-stat-card__sub--link' : ''}
                    />
                </div>
                <div className="col-6 col-sm-6 col-lg-3">
                    <StatCard
                        loading={loading}
                        icon="🎫"
                        label="Membership"
                        value={!loading && <StatusBadge status={data.membershipStatus} />}
                    />
                </div>
                <div className="col-6 col-sm-6 col-lg-3">
                    <StatCard
                        loading={loading}
                        icon="⏳"
                        label="Days Until Expiry"
                        value={
                            !loading && (
                                <span className={expiryClass}>
                                    {Math.max(0, days)}
                                </span>
                            )
                        }
                        sub={isExpired ? 'Membership expired' : null}
                        subClass="db-days--red"
                    />
                </div>
            </div>

            {/* ── Two-column layout ──────────────────── */}
            <div className="row g-4 align-items-start">
                {/* Left column: table + quick actions */}
                <div className="col-12 col-lg-8 d-flex flex-column gap-4">
                    {/* Recent Bookings */}
                    <div className="db-card">
                        <div className="db-card__head">
                            <h3 className="db-card__title">Recent Bookings</h3>
                            <Link to="/my-bookings" className="db-card__viewall">View all →</Link>
                        </div>
                        <div className="table-responsive">
                            <table className="table db-table mb-0">
                                <thead>
                                    <tr>
                                        <th>Seat</th>
                                        <th>Zone</th>
                                        <th>Date</th>
                                        <th>Time Slot</th>
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading
                                        ? <SkeletonRows count={5} cols={6} />
                                        : data.recentBookings.length === 0
                                            ? (
                                                <tr>
                                                    <td colSpan={6} className="db-table__empty">
                                                        No bookings yet.{' '}
                                                        <Link to="/seat-booking" className="db-inline-link">
                                                            Book your first seat
                                                        </Link>
                                                    </td>
                                                </tr>
                                            )
                                            : data.recentBookings.map(b => (
                                                <tr key={b.id}>
                                                    <td>
                                                        <span className="db-seat-num">{b.seatNumber}</span>
                                                    </td>
                                                    <td>
                                                        <span className="db-zone-chip">{b.zone}</span>
                                                    </td>
                                                    <td className="db-table__date">
                                                        {/* ISSUE-9 fix: field is bookingDate, not date */}
                                                        {formatRelativeDay(b.bookingDate)}
                                                    </td>
                                                    <td className="db-table__slot">{b.timeSlot}</td>
                                                    <td><StatusBadge status={b.status} /></td>
                                                    <td>
                                                        {/* ISSUE-10 fix: BookingStatus enum value is ACTIVE, not CONFIRMED */}
                                                        {b.status === 'ACTIVE' && (
                                                            <Link
                                                                to="/my-bookings"
                                                                className="db-table__action"
                                                            >
                                                                Manage
                                                            </Link>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="db-card">
                        <div className="db-card__head">
                            <h3 className="db-card__title">Quick Actions</h3>
                        </div>
                        <div className="row g-3">
                            {[
                                {
                                    icon: '🪑',
                                    title: 'Book a Seat',
                                    desc: 'Reserve your study spot',
                                    to: '/seat-booking',
                                    color: '#0071e3',
                                },
                                {
                                    icon: '🔄',
                                    title: 'Renew Membership',
                                    desc: 'Extend your library access',
                                    to: '/fee-renewal',
                                    color: '#00c896',
                                },
                                {
                                    icon: '📑',
                                    title: 'My Bookings',
                                    desc: 'View & manage bookings',
                                    to: '/my-bookings',
                                    color: '#ff9500',
                                },
                            ].map(a => (
                                <div className="col-12 col-sm-4" key={a.to}>
                                    <Link
                                        to={a.to}
                                        className="db-quick-action"
                                        style={{ '--qa-color': a.color }}
                                    >
                                        <span className="db-quick-action__icon">{a.icon}</span>
                                        <span className="db-quick-action__title">{a.title}</span>
                                        <span className="db-quick-action__desc">{a.desc}</span>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right sidebar */}
                <div className="col-12 col-lg-4 d-flex flex-column gap-4">
                    {/* Next Booking */}
                    <div className="db-card">
                        <div className="db-card__head">
                            <h3 className="db-card__title">Next Booking</h3>
                        </div>
                        {loading
                            ? <div className="db-skel" style={{ height: 80, borderRadius: 10 }} />
                            : data.nextBooking
                                ? (
                                    <div className="db-next">
                                        <div className="db-next__row">
                                            <span className="db-seat-num db-seat-num--lg">
                                                Seat {data.nextBooking.seatNumber}
                                            </span>
                                            <span className="db-zone-chip">{data.nextBooking.zone}</span>
                                        </div>
                                        <p className="db-next__info">
                                            {/* ISSUE-11 fix: field is bookingDate */}
                                            📅 {formatRelativeDay(data.nextBooking.bookingDate)}
                                        </p>
                                        <p className="db-next__info">
                                            🕐 {data.nextBooking.timeSlot}
                                        </p>
                                    </div>
                                )
                                : (
                                    <p className="db-sidebar-empty">
                                        No upcoming bookings.{' '}
                                        <Link to="/seat-booking" className="db-inline-link">
                                            Book one
                                        </Link>
                                    </p>
                                )
                        }
                    </div>

                    {/* Zone Availability */}
                    <div className="db-card">
                        <div className="db-card__head">
                            <h3 className="db-card__title">Today's Availability</h3>
                            <span className="db-live-badge">● Live</span>
                        </div>
                        {loading
                            ? (
                                <div className="d-flex flex-column gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div
                                            key={i}
                                            className="db-skel"
                                            style={{ height: 44, borderRadius: 8 }}
                                        />
                                    ))}
                                </div>
                            )
                            : data.zoneAvailability.length === 0
                                ? <p className="db-sidebar-empty">No availability data.</p>
                                : (
                                    <div className="db-zones">
                                        {data.zoneAvailability.map(z => {
                                            const pct = z.total > 0
                                                ? Math.round((z.available / z.total) * 100)
                                                : 0;
                                            const fill =
                                                pct > 40 ? '#00c896' :
                                                pct > 15 ? '#ff9500' : '#ff3b30';
                                            return (
                                                <div key={z.zone} className="db-zone-row">
                                                    <div className="db-zone-row__head">
                                                        <span className="db-zone-row__name">{z.zone}</span>
                                                        <span className="db-zone-row__count">
                                                            <strong>{z.available}</strong>
                                                            <span className="text-muted">/{z.total}</span>
                                                        </span>
                                                    </div>
                                                    <div className="db-zone-bar">
                                                        <div
                                                            className="db-zone-bar__fill"
                                                            style={{ width: `${pct}%`, background: fill }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StudentDashboard;
