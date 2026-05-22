import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale,
    PointElement, LineElement,
    ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import api from '../../api/axios';
import './AdminDashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

function getLast30DayLabels() {
    return Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - 29 + i);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    });
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(n) {
    return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

const STATUS_CLASS = {
    ACTIVE:    'ad-badge--confirmed',
    COMPLETED: 'ad-badge--completed',
    CANCELLED: 'ad-badge--cancelled',
    PENDING:   'ad-badge--pending',
};

function StatusBadge({ status }) {
    return <span className={`ad-badge ${STATUS_CLASS[status] || 'ad-badge--pending'}`}>{status}</span>;
}

function SkeletonRow({ cols }) {
    return (
        <tr>
            {Array.from({ length: cols }, (_, i) => (
                <td key={i}><div className="ad-skel ad-skel--text" /></td>
            ))}
        </tr>
    );
}

const STAT_ICONS = {
    students: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z"/>
        </svg>
    ),
    bookings: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
        </svg>
    ),
    seats: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M4 6h16v2H4V6zm0 4h16v2H4v-2zm0 4h10v2H4v-2zm14 0h2v5h-2v-5zm-4 0h2v5h-2v-5z"/>
        </svg>
    ),
    revenue: (
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
        </svg>
    ),
};

function StatCard({ label, value, sub, accent, icon, loading }) {
    return (
        <div className={`ad-stat-card ad-stat-card--${accent}`}>
            <div className="ad-stat-card__icon-wrap">{icon}</div>
            <div className="ad-stat-card__body">
                <p className="ad-stat-card__label">{label}</p>
                {loading
                    ? <div className="ad-skel ad-skel--value" />
                    : <p className="ad-stat-card__value">{value ?? '—'}</p>
                }
                {sub && <p className="ad-stat-card__sub">{sub}</p>}
            </div>
        </div>
    );
}

const DAYS = getLast30DayLabels();

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats]               = useState(null);
    const [chartData, setChartData]       = useState(null);
    const [recentBookings, setRecentBookings] = useState([]);
    const [recentPayments, setRecentPayments] = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // ISSUE-25 fix: /api/admin/dashboard/stats and /chart don't exist.
            // Single GET /api/admin/dashboard returns AdminDashboardDTO with all data.
            const { data } = await api.get('/api/admin/dashboard');
            setStats({
                totalStudents:       data.totalStudents,
                activeBookingsToday: data.activeBookingsToday,
                availableSeats:      data.availableSeats,
                totalSeats:          data.totalSeats,
                monthlyRevenue:      data.monthlyRevenue,
            });
            setChartData(null);
            setRecentBookings(data.recentBookings ?? []);
            setRecentPayments(data.recentPayments ?? []);
        } catch {
            setError('Failed to load dashboard data. Check your connection.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ── Chart configs ── */
    const lineData = {
        labels: DAYS,
        datasets: [{
            label: 'Bookings',
            data: chartData?.bookingsPerDay ?? Array(30).fill(0),
            fill: true,
            borderColor: '#0071e3',
            backgroundColor: 'rgba(0, 113, 227, 0.08)',
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.35,
            borderWidth: 2,
        }],
    };
    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { mode: 'index', intersect: false },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { maxTicksLimit: 8, font: { size: 11 }, color: '#6e6e73' },
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: { font: { size: 11 }, color: '#6e6e73', precision: 0 },
            },
        },
    };

    const zoneData = chartData?.zoneAvailability ?? { Quiet: 60, Group: 40, Computers: 30 };
    const doughnutData = {
        labels: Object.keys(zoneData),
        datasets: [{
            data: Object.values(zoneData),
            backgroundColor: ['#0071e3', '#00c896', '#ff9500'],
            borderWidth: 0,
            hoverOffset: 6,
        }],
    };
    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
            tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} seats` } },
        },
        cutout: '68%',
    };

    return (
        <div className="ad-root">
            {/* Page header */}
            <div className="ad-page-hd">
                <div>
                    <h1 className="ad-page-hd__title">Dashboard</h1>
                    <p className="ad-page-hd__sub">Welcome back. Here's what's happening today.</p>
                </div>
                <button className="ad-refresh-btn" onClick={fetchData} disabled={loading}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" className={loading ? 'ad-spin' : ''}>
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                    </svg>
                    Refresh
                </button>
            </div>

            {error && (
                <div className="ad-error-bar">
                    <span>{error}</span>
                    <button onClick={fetchData}>Retry</button>
                </div>
            )}

            {/* ── Stat cards ── */}
            <div className="row g-4 mb-4">
                <div className="col-sm-6 col-xl-3">
                    <StatCard label="Total Students" value={stats?.totalStudents} sub="Registered members" accent="blue" icon={STAT_ICONS.students} loading={loading} />
                </div>
                <div className="col-sm-6 col-xl-3">
                    <StatCard label="Active Bookings Today" value={stats?.activeBookingsToday} sub="Confirmed for today" accent="green" icon={STAT_ICONS.bookings} loading={loading} />
                </div>
                <div className="col-sm-6 col-xl-3">
                    <StatCard label="Available Seats" value={stats ? `${stats.availableSeats} / ${stats.totalSeats}` : null} sub="Right now" accent="teal" icon={STAT_ICONS.seats} loading={loading} />
                </div>
                <div className="col-sm-6 col-xl-3">
                    <StatCard label="Monthly Revenue" value={stats ? formatCurrency(stats.monthlyRevenue) : null} sub="This month" accent="purple" icon={STAT_ICONS.revenue} loading={loading} />
                </div>
            </div>

            {/* ── Charts ── */}
            <div className="row g-4 mb-4">
                <div className="col-xl-8">
                    <div className="ad-card">
                        <div className="ad-card__hd">
                            <p className="ad-card__title">Bookings — Last 30 Days</p>
                        </div>
                        <div className="ad-chart-wrap">
                            {loading
                                ? <div className="ad-skel ad-skel--chart" />
                                : <Line data={lineData} options={lineOptions} />
                            }
                        </div>
                    </div>
                </div>
                <div className="col-xl-4">
                    <div className="ad-card">
                        <div className="ad-card__hd">
                            <p className="ad-card__title">Seat Availability by Zone</p>
                        </div>
                        <div className="ad-chart-wrap ad-chart-wrap--doughnut">
                            {loading
                                ? <div className="ad-skel ad-skel--chart" />
                                : <Doughnut data={doughnutData} options={doughnutOptions} />
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Recent activity ── */}
            <div className="row g-4 mb-5">
                <div className="col-xl-7">
                    <div className="ad-card">
                        <div className="ad-card__hd">
                            <p className="ad-card__title">Recent Bookings</p>
                            <button className="ad-link-btn" onClick={() => navigate('/admin/bookings')}>View all →</button>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 ad-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Seat</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading
                                        ? Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} cols={4} />)
                                        : recentBookings.length === 0
                                            ? <tr><td colSpan={4} className="text-center text-muted py-4">No bookings yet</td></tr>
                                            : recentBookings.map((b) => (
                                                <tr key={b.id}>
                                                    <td>
                                                        <div className="ad-cell-primary">{b.studentName}</div>
                                                        <div className="ad-cell-sub">{b.studentId}</div>
                                                    </td>
                                                    <td>
                                                        <div className="ad-cell-primary">{b.seatNumber}</div>
                                                        <div className="ad-cell-sub">{b.zone}</div>
                                                    </td>
                                                    {/* ISSUE-26 fix: BookingHistoryDTO field is bookingDate */}
                                                    <td>{formatDate(b.bookingDate)}</td>
                                                    <td><StatusBadge status={b.status} /></td>
                                                </tr>
                                            ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="col-xl-5">
                    <div className="ad-card">
                        <div className="ad-card__hd">
                            <p className="ad-card__title">Recent Payments</p>
                            <button className="ad-link-btn" onClick={() => navigate('/admin/reports')}>View all →</button>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 ad-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Plan</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading
                                        ? Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} cols={4} />)
                                        : recentPayments.length === 0
                                            ? <tr><td colSpan={4} className="text-center text-muted py-4">No payments yet</td></tr>
                                            : recentPayments.map((p) => (
                                                <tr key={p.id}>
                                                    <td>
                                                        <div className="ad-cell-primary">{p.studentName}</div>
                                                        <div className="ad-cell-sub">{p.studentId}</div>
                                                    </td>
                                                    <td><span className="ad-plan-chip">{p.plan}</span></td>
                                                    <td className="fw-semibold">{formatCurrency(p.amount)}</td>
                                                    {/* PaymentHistorySummaryDTO uses paidAt, not date */}
                                                    <td>{formatDate(p.paidAt)}</td>
                                                </tr>
                                            ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Quick actions ── */}
            <div className="ad-qa">
                <p className="ad-qa__title">Quick Actions</p>
                <div className="ad-qa__row">
                    <button className="ad-qa-btn ad-qa-btn--blue" onClick={() => navigate('/admin/seats')}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                        </svg>
                        Add Seat
                    </button>
                    <button className="ad-qa-btn ad-qa-btn--teal" onClick={() => navigate('/admin/email')}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                        </svg>
                        Send Broadcast
                    </button>
                    <button className="ad-qa-btn ad-qa-btn--purple" onClick={() => navigate('/admin/reports')}>
                        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd"/>
                        </svg>
                        Export Report
                    </button>
                </div>
            </div>
        </div>
    );
}
