import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import './AdminSeatsPage.css';

// ISSUE-32 fix: SeatZone enum values are QUIET, GROUP, SILENT, OPEN — no COMPUTERS zone
const ZONES     = ['ALL', 'QUIET', 'GROUP', 'SILENT', 'OPEN'];
const STATUSES  = ['AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE'];
const AMENITIES = ['Power Outlet', 'Whiteboard', 'Monitor', 'Window View'];

const ZONE_INITIAL = { QUIET: 'Q', GROUP: 'G', SILENT: 'S', OPEN: 'O' };
const STATUS_LABEL = { AVAILABLE: 'Available', MAINTENANCE: 'Maintenance', UNAVAILABLE: 'Reserve', OCCUPIED: 'Occupied', BOOKED: 'Booked' };

function SeatCell({ seat, onSelect }) {
    let cls = 'ase-seat';
    if (seat.status === 'BOOKED' || seat.status === 'OCCUPIED') cls += ' ase-seat--booked';
    else if (seat.status === 'MAINTENANCE')  cls += ' ase-seat--maintenance';
    else if (seat.status === 'UNAVAILABLE')  cls += ' ase-seat--reserved';
    else                                     cls += ' ase-seat--available';

    return (
        <button
            className={cls}
            onClick={() => onSelect(seat)}
            title={`${seat.seatNumber} — ${STATUS_LABEL[seat.status]}`}
        >
            <span className="ase-seat__num">{seat.seatNumber}</span>
            <span className="ase-seat__zone">{ZONE_INITIAL[seat.zone?.toUpperCase()] ?? seat.zone?.[0]?.toUpperCase()}</span>
        </button>
    );
}

function SkeletonSeat() {
    return <div className="ase-seat ase-seat--skeleton" />;
}

/* ── Status change modal ─────────────────── */
function StatusModal({ seat, onSave, onDelete, onClose, loading }) {
    const [newStatus, setNewStatus] = useState(
        (seat.status === 'BOOKED' || seat.status === 'OCCUPIED') ? 'AVAILABLE' : seat.status
    );

    return (
        <div className="ase-modal-backdrop" onClick={onClose}>
            <div className="ase-modal" onClick={e => e.stopPropagation()}>
                <div className="ase-modal__hd">
                    <h5 className="ase-modal__title">Manage Seat {seat.seatNumber}</h5>
                    <button className="ase-modal__close" onClick={onClose}>✕</button>
                </div>
                <div className="ase-modal__body">
                    <div className="ase-modal-info">
                        <div className="ase-modal-info__row">
                            <span>Seat</span><strong>{seat.seatNumber}</strong>
                        </div>
                        <div className="ase-modal-info__row">
                            <span>Zone</span><strong>{seat.zone}</strong>
                        </div>
                        <div className="ase-modal-info__row">
                            <span>Floor</span><strong>{seat.floor ?? '—'}</strong>
                        </div>
                        <div className="ase-modal-info__row">
                            <span>Current Status</span>
                            <span className={`ase-status-chip ase-status-chip--${seat.status?.toLowerCase()}`}>
                                {STATUS_LABEL[seat.status] ?? seat.status}
                            </span>
                        </div>
                    </div>

                    {seat.status === 'BOOKED' && (
                        <p className="ase-modal-note">⚠️ This seat is currently booked. You can change the status after the booking is completed.</p>
                    )}

                    <p className="ase-modal-label">Change Status</p>
                    <div className="ase-status-radios">
                        {STATUSES.map(s => (
                            <label
                                key={s}
                                className={`ase-radio${newStatus === s ? ' ase-radio--active' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="seat-status"
                                    value={s}
                                    checked={newStatus === s}
                                    onChange={() => setNewStatus(s)}
                                    hidden
                                />
                                <span className={`ase-radio__dot ase-radio__dot--${s.toLowerCase()}`} />
                                <span>{STATUS_LABEL[s]}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="ase-modal__ft">
                    <button
                        className="ase-btn ase-btn--danger-ghost"
                        onClick={() => onDelete(seat)}
                        disabled={loading}
                    >
                        Delete Seat
                    </button>
                    <div className="ase-modal__ft-right">
                        <button className="ase-btn ase-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
                        <button
                            className="ase-btn ase-btn--primary"
                            onClick={() => onSave(seat, newStatus)}
                            disabled={loading || newStatus === seat.status || seat.status === 'BOOKED'}
                        >
                            {loading ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Add Seat modal ──────────────────────── */
const DEFAULT_FORM = { seatNumber: '', zone: 'QUIET', floor: '1', amenities: [] };

function AddSeatModal({ onSave, onClose, loading }) {
    const [form, setForm] = useState(DEFAULT_FORM);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!form.seatNumber.trim()) e.seatNumber = 'Seat number is required';
        else if (!/^[A-Z0-9-]+$/i.test(form.seatNumber.trim())) e.seatNumber = 'Use letters, numbers and hyphens only';
        if (!form.floor || isNaN(form.floor) || Number(form.floor) < 1) e.floor = 'Enter a valid floor number';
        return e;
    };

    const handleSubmit = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        onSave({
            seatNumber: form.seatNumber.trim().toUpperCase(),
            zone: form.zone,
            floor: Number(form.floor),
            status: 'AVAILABLE',
            hasPowerOutlet: form.amenities.includes('Power Outlet'),
            hasWindow: form.amenities.includes('Window View'),
        });
    };

    const toggleAmenity = (a) => {
        setForm(f => ({
            ...f,
            amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
        }));
    };

    return (
        <div className="ase-modal-backdrop" onClick={onClose}>
            <div className="ase-modal" onClick={e => e.stopPropagation()}>
                <div className="ase-modal__hd">
                    <h5 className="ase-modal__title">Add New Seat</h5>
                    <button className="ase-modal__close" onClick={onClose}>✕</button>
                </div>
                <div className="ase-modal__body">
                    <div className="ase-form-row">
                        <label className="ase-form-label">Seat Number *</label>
                        <input
                            type="text"
                            className={`ase-input${errors.seatNumber ? ' ase-input--error' : ''}`}
                            placeholder="e.g. A-12"
                            value={form.seatNumber}
                            onChange={e => { setForm(f => ({ ...f, seatNumber: e.target.value })); setErrors(er => ({ ...er, seatNumber: '' })); }}
                        />
                        {errors.seatNumber && <p className="ase-form-error">{errors.seatNumber}</p>}
                    </div>
                    <div className="ase-form-grid">
                        <div className="ase-form-row">
                            <label className="ase-form-label">Zone *</label>
                            <select
                                className="ase-input"
                                value={form.zone}
                                onChange={e => setForm(f => ({ ...f, zone: e.target.value }))}
                            >
                                <option value="QUIET">Quiet</option>
                                <option value="GROUP">Group</option>
                                <option value="SILENT">Silent</option>
                                <option value="OPEN">Open</option>
                            </select>
                        </div>
                        <div className="ase-form-row">
                            <label className="ase-form-label">Floor *</label>
                            <input
                                type="number"
                                className={`ase-input${errors.floor ? ' ase-input--error' : ''}`}
                                min="1"
                                max="10"
                                value={form.floor}
                                onChange={e => { setForm(f => ({ ...f, floor: e.target.value })); setErrors(er => ({ ...er, floor: '' })); }}
                            />
                            {errors.floor && <p className="ase-form-error">{errors.floor}</p>}
                        </div>
                    </div>
                    <div className="ase-form-row">
                        <label className="ase-form-label">Amenities</label>
                        <div className="ase-amenity-grid">
                            {AMENITIES.map(a => (
                                <label key={a} className={`ase-amenity${form.amenities.includes(a) ? ' ase-amenity--checked' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={form.amenities.includes(a)}
                                        onChange={() => toggleAmenity(a)}
                                        hidden
                                    />
                                    <span className="ase-amenity__check">{form.amenities.includes(a) ? '✓' : ''}</span>
                                    {a}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="ase-modal__ft">
                    <div className="ase-modal__ft-right">
                        <button className="ase-btn ase-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
                        <button className="ase-btn ase-btn--primary" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Adding…' : 'Add Seat'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Main page ───────────────────────────── */
export default function AdminSeatsPage() {
    const [seats, setSeats]             = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');
    const [zoneFilter, setZone]         = useState('ALL');
    const [selectedSeat, setSelected]   = useState(null);
    const [showAdd, setShowAdd]         = useState(false);
    const [actionLoading, setActLoad]   = useState(false);

    const fetchSeats = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (zoneFilter !== 'ALL') params.zone = zoneFilter;
            const { data } = await api.get('/api/admin/seats', { params });
            setSeats(data?.content ?? data ?? []);
        } catch {
            setError('Failed to load seats.');
        } finally {
            setLoading(false);
        }
    }, [zoneFilter]);

    useEffect(() => { fetchSeats(); }, [fetchSeats]);

    const handleStatusSave = async (seat, newStatus) => {
        setActLoad(true);
        try {
            await api.put(`/api/admin/seats/${seat.id}/status`, { status: newStatus });
            toast.success(`${seat.seatNumber} set to ${STATUS_LABEL[newStatus]}.`);
            setSelected(null);
            fetchSeats();
        } catch {
            toast.error('Failed to update seat status.');
        } finally {
            setActLoad(false);
        }
    };

    const handleDeleteSeat = async (seat) => {
        if (!window.confirm(`Delete seat ${seat.seatNumber}? This cannot be undone.`)) return;
        setActLoad(true);
        try {
            await api.delete(`/api/admin/seats/${seat.id}`);
            toast.success(`${seat.seatNumber} deleted.`);
            setSelected(null);
            fetchSeats();
        } catch {
            toast.error('Failed to delete seat.');
        } finally {
            setActLoad(false);
        }
    };

    const handleAddSeat = async (form) => {
        setActLoad(true);
        try {
            await api.post('/api/admin/seats', form);
            toast.success(`Seat ${form.seatNumber} added.`);
            setShowAdd(false);
            fetchSeats();
        } catch (err) {
            toast.error(err.response?.data?.message ?? 'Failed to add seat.');
        } finally {
            setActLoad(false);
        }
    };

    /* Stats */
    const total       = seats.length;
    const available   = seats.filter(s => s.status === 'AVAILABLE').length;
    const booked      = seats.filter(s => s.status === 'BOOKED').length;
    const maintenance = seats.filter(s => s.status === 'MAINTENANCE').length;

    return (
        <div className="ase-root">
            <div className="ase-page-hd">
                <div>
                    <h1 className="ase-page-hd__title">Seats</h1>
                    <p className="ase-page-hd__sub">Click any seat to change its status.</p>
                </div>
                <button className="ase-add-btn" onClick={() => setShowAdd(true)}>
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                    </svg>
                    Add Seat
                </button>
            </div>

            {/* ── Summary stats ── */}
            <div className="ase-stats">
                {[
                    { label: 'Total',       value: total,       cls: 'ase-stat--total'   },
                    { label: 'Available',   value: available,   cls: 'ase-stat--avail'   },
                    { label: 'Booked',      value: booked,      cls: 'ase-stat--booked'  },
                    { label: 'Maintenance', value: maintenance, cls: 'ase-stat--maint'   },
                ].map(s => (
                    <div key={s.label} className={`ase-stat ${s.cls}`}>
                        <p className="ase-stat__value">{loading ? '—' : s.value}</p>
                        <p className="ase-stat__label">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Zone filter ── */}
            <div className="ase-zone-bar">
                {ZONES.map(z => (
                    <button
                        key={z}
                        className={`ase-zone-btn${zoneFilter === z ? ' ase-zone-btn--active' : ''}`}
                        onClick={() => setZone(z)}
                    >
                        {z === 'ALL' ? 'All Zones' : z.charAt(0) + z.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* ── Legend ── */}
            <div className="ase-legend">
                {[
                    { cls: 'ase-legend__dot--available',   label: 'Available'   },
                    { cls: 'ase-legend__dot--booked',      label: 'Booked'      },
                    { cls: 'ase-legend__dot--maintenance', label: 'Maintenance' },
                    { cls: 'ase-legend__dot--reserved',    label: 'Reserved'    },
                ].map(l => (
                    <div key={l.label} className="ase-legend__item">
                        <span className={`ase-legend__dot ${l.cls}`} />
                        <span>{l.label}</span>
                    </div>
                ))}
            </div>

            {error && (
                <div className="ase-error-bar">
                    {error} <button onClick={fetchSeats}>Retry</button>
                </div>
            )}

            {/* ── Seat grid ── */}
            <div className="ase-card">
                <div className="ase-grid">
                    {loading
                        ? Array.from({ length: 24 }, (_, i) => <SkeletonSeat key={i} />)
                        : seats.length === 0
                            ? (
                                <div className="ase-empty">
                                    <div className="ase-empty__icon">🪑</div>
                                    <p className="ase-empty__title">No seats found</p>
                                    <p className="ase-empty__sub">Add your first seat using the button above.</p>
                                </div>
                            )
                            : seats.map(seat => (
                                <SeatCell key={seat.id} seat={seat} onSelect={setSelected} />
                            ))
                    }
                </div>
            </div>

            {selectedSeat && (
                <StatusModal
                    seat={selectedSeat}
                    onSave={handleStatusSave}
                    onDelete={handleDeleteSeat}
                    onClose={() => setSelected(null)}
                    loading={actionLoading}
                />
            )}

            {showAdd && (
                <AddSeatModal
                    onSave={handleAddSeat}
                    onClose={() => setShowAdd(false)}
                    loading={actionLoading}
                />
            )}
        </div>
    );
}
