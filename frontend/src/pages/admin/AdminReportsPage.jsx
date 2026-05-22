import { useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale,
    PointElement, LineElement,
    BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import './AdminReportsPage.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toISODate(d) {
    return d.toISOString().split('T')[0];
}

/* ── CSV export ──────────────────────────── */
function downloadCSV(rows, filename) {
    if (!rows?.length) return;
    const headers = Object.keys(rows[0]);
    const lines   = [
        headers.join(','),
        ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/* Default date range: last 30 days */
function getDefaultDates() {
    const to   = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    return { from: toISODate(from), to: toISODate(to) };
}

const DEFAULT_DATES = getDefaultDates();

const CHART_COLORS = {
    blue:    { bg: 'rgba(0, 113, 227, 0.15)', border: '#0071e3' },
    green:   { bg: 'rgba(0, 200, 150, 0.15)', border: '#00c896' },
    purple:  { bg: 'rgba(124, 58, 237, 0.15)', border: '#7c3aed' },
};

const CHART_OPTS_BASE = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false },
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 10, font: { size: 11 }, color: '#6e6e73' },
        },
        y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { size: 11 }, color: '#6e6e73', precision: 0 },
        },
    },
};

export default function AdminReportsPage() {
    const [reportType, setType]   = useState('bookings');
    const [dateFrom, setFrom]     = useState(DEFAULT_DATES.from);
    const [dateTo, setTo]         = useState(DEFAULT_DATES.to);
    const [reportData, setData]   = useState(null);
    const [loading, setLoading]   = useState(false);
    const [generated, setGen]     = useState(false);

    const handleGenerate = async () => {
        if (!dateFrom || !dateTo) { toast.error('Please select a date range.'); return; }
        if (dateFrom > dateTo)    { toast.error('Start date must be before end date.'); return; }
        setLoading(true);
        setGen(false);
        setData(null);
        try {
            let data;
            if (reportType === 'bookings') {
                // ISSUE-33 fix: bookings report is at /api/admin/bookings/reports?from=&to=
                const res = await api.get('/api/admin/bookings/reports', {
                    params: { from: dateFrom, to: dateTo },
                });
                // Adapt BookingReportResponse to the shape the render expects
                const d = res.data;
                data = {
                    totalBookings:   d.totalBookings,
                    confirmed:       d.totalActive,
                    cancelled:       d.totalCancelled,
                    completed:       d.totalCompleted,
                    rows: (d.peakDays ?? []).map((p) => ({
                        date:      p.date,
                        total:     p.count,
                        confirmed: null,
                        cancelled: null,
                        completed: null,
                    })),
                };
            } else {
                // Revenue report is at /api/admin/reports/revenue?month=YYYY-MM
                const month = dateFrom.substring(0, 7);
                const res   = await api.get('/api/admin/reports/revenue', { params: { month } });
                const d = res.data;
                const rows = Object.entries(d.dailyBreakdown ?? {}).map(([date, revenue]) => ({
                    date,
                    revenue: Number(revenue),
                    count: null,
                }));
                data = {
                    totalRevenue:       Number(d.totalRevenue ?? 0),
                    totalTransactions:  rows.length,
                    rows,
                };
            }
            setData(data);
            setGen(true);
        } catch {
            toast.error('Failed to generate report. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!reportData?.rows?.length) { toast.error('No data to export.'); return; }
        const filename = `${reportType}-report-${dateFrom}-to-${dateTo}.csv`;
        downloadCSV(reportData.rows, filename);
        toast.success('CSV downloaded!');
    };

    /* ── Chart data builders ── */
    const buildBookingsChart = (rows = []) => ({
        labels: rows.map(r => r.date ? formatDate(r.date) : r.label),
        datasets: [{
            label: 'Total Bookings',
            data: rows.map(r => r.total ?? r.count ?? 0),
            backgroundColor: CHART_COLORS.blue.bg,
            borderColor: CHART_COLORS.blue.border,
            borderWidth: 1.5,
            borderRadius: 4,
        }],
    });

    const buildRevenueChart = (rows = []) => ({
        labels: rows.map(r => r.date ? formatDate(r.date) : r.label),
        datasets: [{
            label: 'Revenue (₹)',
            data: rows.map(r => r.revenue ?? r.total ?? 0),
            fill: true,
            borderColor: CHART_COLORS.green.border,
            backgroundColor: CHART_COLORS.green.bg,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.3,
            borderWidth: 2,
        }],
    });

    const rows = reportData?.rows ?? [];

    return (
        <div className="ar-root">
            <div className="ar-page-hd">
                <div>
                    <h1 className="ar-page-hd__title">Reports</h1>
                    <p className="ar-page-hd__sub">Generate and export booking and revenue reports.</p>
                </div>
            </div>

            {/* ── Controls ── */}
            <div className="ar-controls">
                {/* Report type */}
                <div className="ar-type-tabs">
                    <button
                        className={`ar-type-tab${reportType === 'bookings' ? ' ar-type-tab--active' : ''}`}
                        onClick={() => { setType('bookings'); setGen(false); setData(null); }}
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                            <path d="M2 11h4v7H2v-7zm6-4h4v11H8V7zm6-4h4v15h-4V3z"/>
                        </svg>
                        Bookings Report
                    </button>
                    <button
                        className={`ar-type-tab${reportType === 'revenue' ? ' ar-type-tab--active' : ''}`}
                        onClick={() => { setType('revenue'); setGen(false); setData(null); }}
                    >
                        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                            <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                        </svg>
                        Revenue Report
                    </button>
                </div>

                {/* Date range + generate */}
                <div className="ar-date-row">
                    <div className="ar-date-group">
                        <label className="ar-date-label">From</label>
                        <input
                            type="date"
                            className="ar-date-input"
                            value={dateFrom}
                            max={dateTo || undefined}
                            onChange={e => { setFrom(e.target.value); setGen(false); }}
                        />
                    </div>
                    <span className="ar-date-sep">→</span>
                    <div className="ar-date-group">
                        <label className="ar-date-label">To</label>
                        <input
                            type="date"
                            className="ar-date-input"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={e => { setTo(e.target.value); setGen(false); }}
                        />
                    </div>
                    <button
                        className="ar-generate-btn"
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        {loading
                            ? <><span className="ar-spinner" /> Generating…</>
                            : 'Generate Report'
                        }
                    </button>
                </div>
            </div>

            {/* ── Results ── */}
            {!generated && !loading && (
                <div className="ar-placeholder">
                    <div className="ar-placeholder__icon">📊</div>
                    <p className="ar-placeholder__title">No report generated yet</p>
                    <p className="ar-placeholder__sub">Select a date range and click <strong>Generate Report</strong>.</p>
                </div>
            )}

            {loading && (
                <div className="ar-loading">
                    <div className="ar-loading__spinner" />
                    <p>Generating report…</p>
                </div>
            )}

            {generated && reportData && (
                <>
                    {/* Summary row */}
                    <div className="ar-summary">
                        {reportType === 'bookings' ? (
                            <>
                                <div className="ar-summary-card ar-summary-card--blue">
                                    <p className="ar-summary-card__value">{reportData.totalBookings ?? rows.reduce((a, r) => a + (r.total ?? r.count ?? 0), 0)}</p>
                                    <p className="ar-summary-card__label">Total Bookings</p>
                                </div>
                                <div className="ar-summary-card ar-summary-card--green">
                                    <p className="ar-summary-card__value">{reportData.confirmed ?? rows.reduce((a, r) => a + (r.confirmed ?? 0), 0)}</p>
                                    <p className="ar-summary-card__label">Confirmed</p>
                                </div>
                                <div className="ar-summary-card ar-summary-card--orange">
                                    <p className="ar-summary-card__value">{reportData.cancelled ?? rows.reduce((a, r) => a + (r.cancelled ?? 0), 0)}</p>
                                    <p className="ar-summary-card__label">Cancelled</p>
                                </div>
                                <div className="ar-summary-card ar-summary-card--grey">
                                    <p className="ar-summary-card__value">{reportData.completed ?? rows.reduce((a, r) => a + (r.completed ?? 0), 0)}</p>
                                    <p className="ar-summary-card__label">Completed</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="ar-summary-card ar-summary-card--green">
                                    <p className="ar-summary-card__value">₹{(reportData.totalRevenue ?? rows.reduce((a, r) => a + (r.revenue ?? 0), 0)).toLocaleString('en-IN')}</p>
                                    <p className="ar-summary-card__label">Total Revenue</p>
                                </div>
                                <div className="ar-summary-card ar-summary-card--blue">
                                    <p className="ar-summary-card__value">{reportData.totalTransactions ?? rows.reduce((a, r) => a + (r.count ?? 0), 0)}</p>
                                    <p className="ar-summary-card__label">Transactions</p>
                                </div>
                                <div className="ar-summary-card ar-summary-card--purple">
                                    <p className="ar-summary-card__value">₹{Math.round((reportData.totalRevenue ?? 0) / Math.max(reportData.totalTransactions ?? 1, 1)).toLocaleString('en-IN')}</p>
                                    <p className="ar-summary-card__label">Avg. Transaction</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Chart */}
                    {rows.length > 0 && (
                        <div className="ar-chart-card">
                            <div className="ar-chart-card__hd">
                                <p className="ar-chart-card__title">
                                    {reportType === 'bookings' ? 'Bookings per Day' : 'Revenue per Day'}
                                </p>
                            </div>
                            <div className="ar-chart-wrap">
                                {reportType === 'bookings'
                                    ? <Bar data={buildBookingsChart(rows)} options={CHART_OPTS_BASE} />
                                    : <Line data={buildRevenueChart(rows)} options={CHART_OPTS_BASE} />
                                }
                            </div>
                        </div>
                    )}

                    {/* Table + export */}
                    <div className="ar-table-card">
                        <div className="ar-table-card__hd">
                            <p className="ar-table-card__title">
                                {reportType === 'bookings' ? 'Booking Details' : 'Revenue Details'}
                            </p>
                            <button
                                className="ar-export-btn"
                                onClick={handleExport}
                                disabled={!rows.length}
                            >
                                <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                                </svg>
                                Export CSV
                            </button>
                        </div>
                        <div className="table-responsive">
                            {rows.length === 0 ? (
                                <div className="ar-empty">No data for this period.</div>
                            ) : reportType === 'bookings' ? (
                                <table className="table table-hover mb-0 ar-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Total</th>
                                            <th>Confirmed</th>
                                            <th>Completed</th>
                                            <th>Cancelled</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, i) => (
                                            <tr key={i}>
                                                <td>{formatDate(r.date) || r.label || '—'}</td>
                                                <td className="fw-semibold">{r.total ?? r.count ?? 0}</td>
                                                <td><span className="ar-val ar-val--green">{r.confirmed ?? '—'}</span></td>
                                                <td><span className="ar-val ar-val--grey">{r.completed ?? '—'}</span></td>
                                                <td><span className="ar-val ar-val--red">{r.cancelled ?? '—'}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="table table-hover mb-0 ar-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Plan</th>
                                            <th>Transactions</th>
                                            <th>Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, i) => (
                                            <tr key={i}>
                                                <td>{formatDate(r.date) || r.label || '—'}</td>
                                                <td>{r.plan ?? 'All Plans'}</td>
                                                <td>{r.count ?? '—'}</td>
                                                <td className="fw-semibold ar-val ar-val--green">₹{Number(r.revenue ?? 0).toLocaleString('en-IN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
