import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PageHeader from '../components/PageHeader';
import { formatDate } from '../utils/formatDate';
import './SeatBookingPage.css';

/* ── Constants ───────────────────────────────── */
const TIME_SLOTS = [
    { id: 'MORNING',   label: 'Morning',   time: '9 AM – 12 PM' },
    { id: 'AFTERNOON', label: 'Afternoon', time: '12 PM – 3 PM'  },
    { id: 'EVENING',   label: 'Evening',   time: '3 PM – 6 PM'   },
];

// SeatZone enum values: QUIET, GROUP, SILENT, OPEN
const ZONES = ['All', 'Quiet', 'Group', 'Silent', 'Open'];

const ZONE_INITIAL = { Quiet: 'Q', Group: 'G', Silent: 'S', Open: 'O' };

function isPastCutoff() {
    return new Date().getHours() >= 18;
}

function minDateStr() {
    const d = new Date();
    if (isPastCutoff()) d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
}

function maxDateStr() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
}

/* ── Legend Item ─────────────────────────────── */
function LegendDot({ variant, label }) {
    return (
        <span className="sb-legend-item">
            <span className={`sb-legend-dot sb-seat--${variant}`} />
            {label}
        </span>
    );
}

/* ── Single Seat ─────────────────────────────── */
function SeatCell({ seat, selectedId, onSelect }) {
    const isAvailable = seat.status === 'AVAILABLE';
    const isSelected  = seat.id === selectedId;

    const variant =
        isSelected                                            ? 'selected'    :
        isAvailable                                           ? 'available'   :
        seat.status === 'OCCUPIED' || seat.status === 'BOOKED' ? 'booked'   :
                                                                 'maintenance';

    const zoneInit = ZONE_INITIAL[seat.zone] ?? seat.zone?.[0] ?? '';

    const tooltip =
        seat.status === 'OCCUPIED' || seat.status === 'BOOKED' ? 'Already booked for this slot' :
        seat.status === 'MAINTENANCE'                          ? 'Under maintenance'             :
        seat.status === 'UNAVAILABLE'                          ? 'Unavailable'                  :
        `${seat.seatNumber} · ${seat.zone}`;

    return (
        <button
            type="button"
            className={`sb-seat sb-seat--${variant}`}
            disabled={!isAvailable}
            onClick={() => onSelect(seat)}
            title={tooltip}
            aria-pressed={isSelected}
            aria-label={`Seat ${seat.seatNumber}, ${seat.zone}, ${seat.status}`}
        >
            <span className="sb-seat__num">{seat.seatNumber}</span>
            <span className="sb-seat__zone">{zoneInit}</span>
        </button>
    );
}

/* ── Skeleton seat ───────────────────────────── */
function SkeletonSeat() {
    return <div className="sb-seat sb-seat--skeleton" aria-hidden="true" />;
}

/* ── Membership Expired Modal ────────────────── */
function ExpiredModal({ onClose }) {
    return (
        <div
            className="sb-backdrop"
            onClick={e => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="expired-title"
        >
            <div className="sb-modal">
                <span className="sb-modal__icon">🔒</span>
                <h3 className="sb-modal__title" id="expired-title">Membership Required</h3>
                <p className="sb-modal__body">
                    Your library membership has expired. Renew it to start booking seats.
                </p>
                <div className="sb-modal__actions">
                    <button className="sb-btn sb-btn--ghost" onClick={onClose}>
                        Maybe Later
                    </button>
                    <Link to="/fee-renewal" className="sb-btn sb-btn--primary">
                        Renew Membership →
                    </Link>
                </div>
            </div>
        </div>
    );
}

/* ── Main Component ──────────────────────────── */
function SeatBookingPage() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    /* Filters */
    const [date, setDate]         = useState(minDateStr());
    const [timeSlot, setTimeSlot] = useState('');
    const [zone, setZone]         = useState('All');

    /* Seats */
    const [seats, setSeats]               = useState([]);
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [hasSearched, setHasSearched]   = useState(false);

    /* UI */
    const [searching, setSearching]           = useState(false);
    const [booking, setBooking]               = useState(false);
    const [showExpired, setShowExpired]       = useState(false);
    const [filterErrors, setFilterErrors]     = useState({});

    /* Membership guard on mount */
    useEffect(() => {
        if (currentUser?.membershipStatus === 'EXPIRED') setShowExpired(true);
    }, [currentUser]);

    const validate = () => {
        const e = {};
        if (!date)     e.date     = 'Please select a date.';
        if (!timeSlot) e.timeSlot = 'Please select a time slot.';
        return e;
    };

    const handleSearch = useCallback(async () => {
        const errs = validate();
        if (Object.keys(errs).length) { setFilterErrors(errs); return; }

        setFilterErrors({});
        setSelectedSeat(null);
        setSearching(true);
        setHasSearched(true);

        try {
            // ISSUE-12 fix: backend expects 'slot', not 'timeSlot' as the query param name
            const params = new URLSearchParams({ date, slot: timeSlot });
            if (zone !== 'All') params.set('zone', zone.toUpperCase());
            const { data } = await api.get(`/api/seats/availability?${params}`);
            setSeats(Array.isArray(data) ? data : (data.seats ?? []));
        } catch (err) {
            if (err.response?.status === 403) {
                setShowExpired(true);
                setHasSearched(false);
            } else {
                toast.error('Failed to load seats. Please try again.');
                setSeats([]);
            }
        } finally {
            setSearching(false);
        }
    }, [date, timeSlot, zone]);

    const handleConfirm = async () => {
        if (!selectedSeat) return;
        setBooking(true);
        try {
            // ISSUE-13 fix: BookingRequest expects 'bookingDate', not 'date'
            await api.post('/api/bookings', {
                seatId:      selectedSeat.id,
                bookingDate: date,
                timeSlot,
            });
            const slotObj = TIME_SLOTS.find(s => s.id === timeSlot);
            toast.success(
                `Seat ${selectedSeat.seatNumber} booked for ${slotObj?.label} on ${formatDate(date)} ✅`
            );
            setTimeout(() => navigate('/my-bookings'), 1500);
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Booking failed. Please try again.');
        } finally {
            setBooking(false);
        }
    };

    const availableCount = seats.filter(s => s.status === 'AVAILABLE').length;
    const activeSlot     = TIME_SLOTS.find(s => s.id === timeSlot);

    return (
        <div className="sb-page">
            <PageHeader
                title="Book a Seat"
                subtitle="Choose your date, time slot, and seat"
                breadcrumbs={[
                    { label: 'Dashboard', to: '/dashboard' },
                    { label: 'Seat Booking' },
                ]}
            />

            {/* ── Step 1: Filters ──────────────────── */}
            <div className="sb-card mb-4">
                <h3 className="sb-step-title">
                    <span className="sb-step-badge">1</span>
                    Select Date, Time &amp; Zone
                </h3>

                <div className="row g-4 align-items-start">
                    {/* Date */}
                    <div className="col-12 col-md-4">
                        <label className="sb-label" htmlFor="sb-date">Date</label>
                        <input
                            id="sb-date"
                            type="date"
                            className={`sb-date-input${filterErrors.date ? ' sb-input--err' : ''}`}
                            value={date}
                            min={minDateStr()}
                            max={maxDateStr()}
                            onChange={e => {
                                setDate(e.target.value);
                                setFilterErrors(p => ({ ...p, date: '' }));
                            }}
                        />
                        {filterErrors.date
                            ? <span className="sb-field-err">{filterErrors.date}</span>
                            : <span className="sb-helper">Book up to 7 days ahead</span>
                        }
                    </div>

                    {/* Time Slots */}
                    <div className="col-12 col-md-8">
                        <label className="sb-label">Time Slot</label>
                        <div className={`sb-slot-row${filterErrors.timeSlot ? ' sb-slot-row--err' : ''}`}>
                            {TIME_SLOTS.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    className={`sb-slot${timeSlot === s.id ? ' sb-slot--active' : ''}`}
                                    onClick={() => {
                                        setTimeSlot(s.id);
                                        setFilterErrors(p => ({ ...p, timeSlot: '' }));
                                    }}
                                >
                                    <span className="sb-slot__name">{s.label}</span>
                                    <span className="sb-slot__time">{s.time}</span>
                                </button>
                            ))}
                        </div>
                        {filterErrors.timeSlot && (
                            <span className="sb-field-err">{filterErrors.timeSlot}</span>
                        )}
                    </div>

                    {/* Zone */}
                    <div className="col-12">
                        <label className="sb-label">Zone</label>
                        <div className="sb-zone-row" role="group" aria-label="Zone filter">
                            {ZONES.map(z => (
                                <button
                                    key={z}
                                    type="button"
                                    className={`sb-zone-btn${zone === z ? ' sb-zone-btn--active' : ''}`}
                                    onClick={() => setZone(z)}
                                >
                                    {z}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search CTA */}
                    <div className="col-12">
                        <button
                            className="sb-search-btn"
                            onClick={handleSearch}
                            disabled={searching}
                        >
                            {searching ? (
                                <>
                                    <span
                                        className="spinner-border spinner-border-sm"
                                        role="status"
                                        aria-hidden="true"
                                    />
                                    Searching…
                                </>
                            ) : '🔍 Search Available Seats'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Step 2: Seat Grid ─────────────────── */}
            {hasSearched && (
                <div className="sb-card mb-4">
                    <div className="sb-grid-head">
                        <h3 className="sb-step-title mb-0">
                            <span className="sb-step-badge">2</span>
                            Pick a Seat
                        </h3>
                        {!searching && seats.length > 0 && (
                            <span className="sb-avail-tag">
                                <strong className="sb-avail-tag__num">{availableCount}</strong>
                                {' '}available
                            </span>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="sb-legend">
                        <LegendDot variant="available"   label="Available"   />
                        <LegendDot variant="selected"    label="Selected"    />
                        <LegendDot variant="booked"      label="Booked"      />
                        <LegendDot variant="maintenance" label="Maintenance" />
                    </div>

                    {searching ? (
                        <div className="sb-seat-grid">
                            {Array.from({ length: 24 }, (_, i) => <SkeletonSeat key={i} />)}
                        </div>
                    ) : seats.length === 0 ? (
                        <div className="sb-empty">
                            <span className="sb-empty__icon">🪑</span>
                            <p className="sb-empty__title">No seats available</p>
                            <p className="sb-empty__sub">
                                Try a different date, time slot, or zone.
                            </p>
                        </div>
                    ) : (
                        <div className="sb-seat-grid">
                            {seats.map(seat => (
                                <SeatCell
                                    key={seat.id}
                                    seat={seat}
                                    selectedId={selectedSeat?.id}
                                    onSelect={setSelectedSeat}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Step 3: Booking Summary Bar ──────── */}
            <div
                className={`sb-bar${selectedSeat ? ' sb-bar--visible' : ''}`}
                aria-hidden={!selectedSeat}
                role="region"
                aria-label="Booking summary"
            >
                <div className="sb-bar__inner">
                    <div className="sb-bar__info">
                        <div className="sb-bar__seat-row">
                            <span className="sb-bar__seatnum">
                                Seat&nbsp;{selectedSeat?.seatNumber}
                            </span>
                            {selectedSeat?.zone && (
                                <span className="sb-zone-chip">{selectedSeat.zone}</span>
                            )}
                        </div>
                        <div className="sb-bar__meta">
                            <span>📅&nbsp;{date ? formatDate(date) : '—'}</span>
                            <span className="sb-bar__sep">·</span>
                            <span>
                                🕐&nbsp;{activeSlot
                                    ? `${activeSlot.label} (${activeSlot.time})`
                                    : '—'}
                            </span>
                            <span className="sb-bar__sep">·</span>
                            <span>👤&nbsp;{currentUser?.fullName ?? '—'}</span>
                        </div>
                    </div>

                    <div className="sb-bar__actions">
                        <button
                            className="sb-btn sb-btn--ghost"
                            onClick={() => setSelectedSeat(null)}
                            disabled={booking}
                        >
                            Cancel
                        </button>
                        <button
                            className="sb-btn sb-btn--primary"
                            onClick={handleConfirm}
                            disabled={booking}
                        >
                            {booking ? (
                                <>
                                    <span
                                        className="spinner-border spinner-border-sm"
                                        aria-hidden="true"
                                    />
                                    Booking…
                                </>
                            ) : 'Confirm Booking'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Membership expired modal ──────────── */}
            {showExpired && <ExpiredModal onClose={() => setShowExpired(false)} />}
        </div>
    );
}

export default SeatBookingPage;
