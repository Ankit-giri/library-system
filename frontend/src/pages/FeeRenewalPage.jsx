import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

import PageHeader from '../components/PageHeader';
import { formatDate } from '../utils/formatDate';
import './FeeRenewalPage.css';

/* ── Plan definitions ────────────────────────── */
// ISSUE-19 fix: SEMESTER and ANNUAL don't exist in backend PaymentPlan enum.
// Actual plans: WEEKLY(79/7d), MONTHLY(199/30d), QUARTERLY(549/90d), YEARLY(1999/365d)
const PLANS = [
    {
        id: 'WEEKLY',
        title: 'Weekly',
        price: 79,
        priceLabel: '₹79',
        period: '/week',
        days: 7,
        features: ['7 days full access', 'Seat booking', 'Digital resources'],
    },
    {
        id: 'MONTHLY',
        title: 'Monthly',
        price: 199,
        priceLabel: '₹199',
        period: '/month',
        days: 30,
        features: ['30 days full access', 'Seat booking', 'Digital resources'],
    },
    {
        id: 'QUARTERLY',
        title: 'Quarterly',
        price: 549,
        priceLabel: '₹549',
        period: '/3 months',
        days: 90,
        savings: '₹48',
        featured: true,
        features: ['90 days full access', 'Seat booking', 'Digital resources', 'Priority support'],
    },
    {
        id: 'YEARLY',
        title: 'Yearly',
        price: 1999,
        priceLabel: '₹1,999',
        period: '/year',
        days: 365,
        features: ['365 days full access', 'Seat booking', 'Digital resources', 'Priority support', 'Exclusive study rooms'],
    },
];

const PLAN_LABELS = { WEEKLY: 'Weekly', MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', YEARLY: 'Yearly' };

const CONFETTI_COLORS = ['#0071e3', '#00c896', '#ff9500', '#ff3b30', '#af52de', '#ffd60a', '#34aadc', '#ff6b6b'];

/* ── Helpers ─────────────────────────────────── */
function deriveStatus(m) {
    if (!m) return null;
    if (m.status === 'EXPIRED') return 'EXPIRED';
    if (m.status === 'EXPIRING_SOON' || (m.daysRemaining ?? 0) <= 7) return 'EXPIRING_SOON';
    return 'ACTIVE';
}

function calcNewExpiry(currentExpiry, planDays, isExpired) {
    const base = isExpired || !currentExpiry ? new Date() : new Date(currentExpiry);
    base.setDate(base.getDate() + planDays);
    return base.toISOString().split('T')[0];
}

function formatCard(v) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ');
}

function progressColor(pct) {
    if (pct > 50) return 'var(--color-success)';
    if (pct > 15) return 'var(--color-warning)';
    return 'var(--color-danger)';
}

/* ── Confetti ────────────────────────────────── */
function Confetti() {
    const pieces = useMemo(() =>
        Array.from({ length: 60 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            delay: Math.random() * 1.4,
            dur: 2.2 + Math.random() * 2,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            w: 6 + Math.random() * 9,
            h: 4 + Math.random() * 7,
            dx: (Math.random() - 0.5) * 110,
            rot: 200 + Math.random() * 400,
        }))
    , []);

    return (
        <div className="fr-confetti" aria-hidden="true">
            {pieces.map(p => (
                <span
                    key={p.id}
                    className="fr-confetti__piece"
                    style={{
                        left: `${p.x}%`,
                        width: p.w,
                        height: p.h,
                        background: p.color,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.dur}s`,
                        '--dx': `${p.dx}px`,
                        '--rot': `${p.rot}deg`,
                    }}
                />
            ))}
        </div>
    );
}

/* ── Status chip ─────────────────────────────── */
function StatusChip({ status }) {
    const cfg = {
        ACTIVE:        { cls: 'fr-chip--green', text: '● Active'        },
        EXPIRING_SOON: { cls: 'fr-chip--amber', text: '● Expiring Soon' },
        EXPIRED:       { cls: 'fr-chip--red',   text: '● Expired'       },
    };
    const { cls = 'fr-chip--grey', text = status } = cfg[status] ?? {};
    return <span className={`fr-chip ${cls}`}>{text}</span>;
}

/* ── Txn status badge ────────────────────────── */
function TxnBadge({ status }) {
    const cfg = {
        SUCCESS: { cls: 'fr-txn--green', text: 'Success' },
        FAILED:  { cls: 'fr-txn--red',   text: 'Failed'  },
        PENDING: { cls: 'fr-txn--amber', text: 'Pending' },
    };
    const { cls = '', text = status } = cfg[status] ?? {};
    return <span className={`fr-txn-badge ${cls}`}>{text}</span>;
}

/* ── Skeleton ────────────────────────────────── */
function StatusSkeleton() {
    return (
        <div className="fr-card mb-4">
            {[['60%', 20], ['40%', 14], ['80%', 14], ['100%', 8]].map(([w, h], i) => (
                <div key={i} className="fr-skel" style={{ width: w, height: h, marginBottom: 16 }} />
            ))}
        </div>
    );
}

/* ════════════════════════════════════════════════
   Payment Modal
════════════════════════════════════════════════ */
function PaymentModal({ plan, membership, onClose, onMembershipUpdate }) {
    const { currentUser } = useAuth();
    const [step, setStep]             = useState('form');
    const [cardName, setCardName]     = useState('');
    const [cardNum, setCardNum]       = useState('');
    const [cardErr, setCardErr]       = useState('');
    const [simulate, setSimulate]     = useState(false);
    const [successData, setSuccess]   = useState(null);

    const isExpired  = membership?.status === 'EXPIRED';
    const newExpiry  = calcNewExpiry(membership?.expiryDate, plan.days, isExpired);
    const canClose   = step !== 'processing';

    const handlePay = async () => {
        const digits = cardNum.replace(/\s/g, '');
        if (digits.length < 16) { setCardErr('Enter a valid 16-digit card number.'); return; }
        if (!cardName.trim())   { setCardErr('Enter the cardholder name.'); return; }
        setCardErr('');
        setStep('processing');

        /* Demo failure path — skip real API */
        if (simulate) {
            await new Promise(r => setTimeout(r, 1600));
            setStep('failure');
            return;
        }

        const last4 = digits.slice(-4);
        const studentId = currentUser?.studentId;
        try {
            // ISSUE-21 fix: plan as query param + X-Student-Id header; no request body
            const { data: init } = await api.post(
                `/api/payments/initiate?plan=${plan.id}`,
                null,
                { headers: { 'X-Student-Id': studentId } }
            );
            // ISSUE-22 fix: correct field names: sessionId, cardLastFour, simulateSuccess
            await api.post('/api/payments/confirm', {
                sessionId:       init.sessionId,
                cardLastFour:    last4,
                simulateSuccess: !simulate,
            });
            // ISSUE-23 fix: confirm returns 200 void — compute expiry locally
            const resolvedExpiry = calcNewExpiry(membership?.expiryDate, plan.days, isExpired);
            const txnId = `TXN${Date.now()}`;
            setSuccess({ newExpiryDate: resolvedExpiry, transactionId: txnId, last4 });
            onMembershipUpdate({ plan: plan.id, expiryDate: resolvedExpiry, days: plan.days });
            setStep('success');
        } catch {
            setStep('failure');
        }
    };

    const handleDone = () => {
        toast.success(`Membership renewed! Expires ${formatDate(successData.newExpiryDate)} 🎉`);
        onClose();
    };

    return (
        <div
            className="fr-backdrop"
            onClick={e => e.target === e.currentTarget && canClose && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pay-title"
        >
            <div className="fr-pay-modal">
                {canClose && (
                    <button className="fr-modal-x" onClick={onClose} aria-label="Close">✕</button>
                )}

                {/* ── form ─────────────────────── */}
                {step === 'form' && (
                    <>
                        <h3 className="fr-pay-modal__title" id="pay-title">Complete Payment</h3>

                        <div className="fr-pay-summary">
                            {[
                                ['Plan',       plan.title],
                                ['Duration',   `${plan.days} days`],
                                ['Amount',     plan.priceLabel],
                                ['New Expiry', formatDate(newExpiry)],
                            ].map(([label, value], i) => (
                                <div
                                    key={label}
                                    className={`fr-sum-row${i === 2 ? ' fr-sum-row--amount' : i === 3 ? ' fr-sum-row--expiry' : ''}`}
                                >
                                    <span className="fr-sum-row__label">{label}</span>
                                    <span className="fr-sum-row__val">{value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="fr-field">
                            <label className="fr-field__label" htmlFor="fr-card-name">Cardholder Name</label>
                            <input
                                id="fr-card-name"
                                type="text"
                                className="fr-field__input"
                                placeholder="Name on card"
                                value={cardName}
                                onChange={e => { setCardName(e.target.value); setCardErr(''); }}
                                autoComplete="cc-name"
                            />
                        </div>

                        <div className="fr-field">
                            <label className="fr-field__label" htmlFor="fr-card-num">Card Number</label>
                            <div className="fr-card-wrap">
                                <input
                                    id="fr-card-num"
                                    type="text"
                                    inputMode="numeric"
                                    className={`fr-field__input${cardErr ? ' fr-input--err' : ''}`}
                                    placeholder="0000 0000 0000 0000"
                                    value={cardNum}
                                    onChange={e => { setCardNum(formatCard(e.target.value)); setCardErr(''); }}
                                    maxLength={19}
                                    autoComplete="cc-number"
                                />
                                <span className="fr-card-emoji" aria-hidden="true">💳</span>
                            </div>
                            {cardErr && <span className="fr-field-err">{cardErr}</span>}
                        </div>

                        <label className="fr-demo-row">
                            <input
                                type="checkbox"
                                className="fr-demo-check"
                                checked={simulate}
                                onChange={e => setSimulate(e.target.checked)}
                            />
                            <span className="fr-demo-text">Simulate payment failure</span>
                            <span className="fr-demo-tag">DEMO</span>
                        </label>

                        <button className="fr-pay-btn" onClick={handlePay}>
                            Pay {plan.priceLabel}
                        </button>
                    </>
                )}

                {/* ── processing ───────────────── */}
                {step === 'processing' && (
                    <div className="fr-processing">
                        <span
                            className="spinner-border text-primary fr-processing__spin"
                            role="status"
                            aria-label="Processing payment"
                        />
                        <p className="fr-processing__label">Processing payment…</p>
                        <p className="fr-processing__sub">Please do not close this window.</p>
                    </div>
                )}

                {/* ── success ──────────────────── */}
                {step === 'success' && successData && (
                    <div className="fr-success-pane">
                        <Confetti />
                        <div className="fr-ok-icon" aria-hidden="true">✓</div>
                        <h3 className="fr-success__title">Payment Successful!</h3>
                        <p className="fr-success__sub">Your membership has been renewed.</p>

                        <div className="fr-success-rows">
                            {[
                                ['Plan',           `${plan.title} · ${plan.days} days`],
                                ['New Expiry',     formatDate(successData.newExpiryDate)],
                                ['Amount Paid',    plan.priceLabel],
                                ['Card',           `•••• •••• •••• ${successData.last4}`],
                                ['Transaction ID', successData.transactionId],
                            ].map(([lbl, val]) => (
                                <div className="fr-success-rows__row" key={lbl}>
                                    <span>{lbl}</span>
                                    <strong className={lbl === 'Transaction ID' ? 'fr-txn-id' : ''}>
                                        {val}
                                    </strong>
                                </div>
                            ))}
                        </div>

                        <button className="fr-pay-btn fr-pay-btn--ok" onClick={handleDone}>
                            Done ✓
                        </button>
                    </div>
                )}

                {/* ── failure ──────────────────── */}
                {step === 'failure' && (
                    <div className="fr-failure-pane">
                        <div className="fr-fail-icon" aria-hidden="true">✕</div>
                        <h3 className="fr-failure__title">Payment Failed</h3>
                        <p className="fr-failure__sub">
                            {simulate
                                ? 'This was a simulated failure (demo mode).'
                                : 'Your payment could not be processed. Check your card details and try again.'}
                        </p>
                        <div className="fr-failure__actions">
                            <button className="fr-btn-ghost" onClick={onClose}>Cancel</button>
                            <button className="fr-pay-btn" onClick={() => setStep('form')}>
                                Try Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════
   Main Page
════════════════════════════════════════════════ */
function FeeRenewalPage() {
    const { currentUser } = useAuth();
    const [membership, setMembership]   = useState(null);
    const [history, setHistory]         = useState([]);
    const [loading, setLoading]         = useState(true);
    const [selectedPlan, setSelected]   = useState(null);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        try {
            const studentId = currentUser?.studentId;
            if (!studentId) { setLoading(false); return; }

            // ISSUE-20 fix: endpoint is /api/payments/my-membership with X-Student-Id header
            const [membershipRes, historyRes] = await Promise.all([
                api.get('/api/payments/my-membership', { headers: { 'X-Student-Id': studentId } }),
                api.get('/api/payments/history',       { headers: { 'X-Student-Id': studentId } }),
            ]);

            const m = membershipRes.data;
            // MembershipStatusDTO: { active, expiryDate, plan }
            const daysRemaining = m.expiryDate
                ? Math.max(0, Math.ceil((new Date(m.expiryDate) - new Date()) / 86_400_000))
                : 0;
            const planDef = PLANS.find((p) => p.id === m.plan);
            setMembership({
                status:       m.active ? 'ACTIVE' : 'EXPIRED',
                expiryDate:   m.expiryDate ?? null,
                plan:         m.plan ?? null,
                daysRemaining,
                totalDays:    planDef?.days ?? 30,
            });
            setHistory(historyRes.data ?? []);
        } catch {
            toast.error('Failed to load membership status.');
        } finally {
            setLoading(false);
        }
    }, [currentUser?.studentId]);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const handleMembershipUpdate = useCallback(({ plan, expiryDate, days }) => {
        setMembership(prev => ({
            ...prev,
            status: 'ACTIVE',
            plan,
            expiryDate,
            daysRemaining: days,
            totalDays: days,
        }));
    }, []);

    const status   = deriveStatus(membership);
    const days     = membership?.daysRemaining ?? 0;
    const total    = membership?.totalDays ?? 30;
    const pct      = total > 0 ? Math.min(100, Math.max(0, Math.round((days / total) * 100))) : 0;

    return (
        <div className="fr-page">
            <PageHeader
                title="Fee Renewal"
                subtitle="Manage your library membership and billing"
                breadcrumbs={[
                    { label: 'Dashboard', to: '/dashboard' },
                    { label: 'Fee Renewal' },
                ]}
            />

            {/* ── Section 1: Status ────────────── */}
            <h2 className="fr-section-head">Membership Status</h2>

            {loading ? <StatusSkeleton /> : (
                <div className="fr-card mb-5">
                    {/* Header row */}
                    <div className="fr-stat-header">
                        <div>
                            <h3 className="fr-student-name">{currentUser?.fullName ?? '—'}</h3>
                            <p className="fr-student-meta">
                                <span className="fr-id">
                                    ID: {currentUser?.studentId ?? membership?.studentId ?? '—'}
                                </span>
                                <span className="fr-sep">·</span>
                                <span>Plan: {PLAN_LABELS[membership?.plan] ?? '—'}</span>
                            </p>
                        </div>
                        <StatusChip status={status} />
                    </div>

                    {/* Expiry + days */}
                    <div className="fr-stat-row">
                        <div className="fr-stat-item">
                            <span className="fr-stat-item__lbl">Expiry Date</span>
                            <span className="fr-stat-item__val">
                                {membership?.expiryDate ? formatDate(membership.expiryDate) : '—'}
                            </span>
                        </div>
                        <div className="fr-stat-item">
                            <span className="fr-stat-item__lbl">Days Remaining</span>
                            <span className="fr-stat-item__val" style={{ color: progressColor(pct) }}>
                                {status === 'EXPIRED' ? 'Expired' : `${days} day${days !== 1 ? 's' : ''}`}
                            </span>
                        </div>
                        <div className="fr-stat-item">
                            <span className="fr-stat-item__lbl">Membership</span>
                            <span className="fr-stat-item__val">
                                {pct}% remaining
                            </span>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="fr-prog-wrap">
                        <div className="fr-prog-track">
                            <div
                                className="fr-prog-fill"
                                style={{ width: `${pct}%`, background: progressColor(pct) }}
                                role="progressbar"
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            />
                        </div>
                    </div>

                    {/* Payment history */}
                    {history.length > 0 && (
                        <div className="fr-history">
                            <h4 className="fr-history__title">Payment History</h4>
                            <div className="table-responsive">
                                <table className="table fr-table mb-0">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Plan</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Transaction ID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((h, i) => (
                                            <tr key={h.id ?? i}>
                                                <td>{h.date ? formatDate(h.date) : '—'}</td>
                                                <td>{PLAN_LABELS[h.plan] ?? h.plan ?? '—'}</td>
                                                <td className="fr-table__amt">
                                                    ₹{(h.amount ?? 0).toLocaleString('en-IN')}
                                                </td>
                                                <td><TxnBadge status={h.status} /></td>
                                                <td>
                                                    <code className="fr-txn-code">{h.transactionId ?? '—'}</code>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Section 2: Plans ─────────────── */}
            <h2 className="fr-section-head">Choose a Plan</h2>

            <div className="row g-4 mb-5">
                {PLANS.map(plan => (
                    <div key={plan.id} className="col-12 col-md-4">
                        <div className={`fr-plan${plan.featured ? ' fr-plan--featured' : ''}`}>
                            {plan.featured && (
                                <div className="fr-plan__badge">⭐ Best Value — Save {plan.savings}</div>
                            )}
                            <div className="fr-plan__head">
                                <h3 className="fr-plan__title">{plan.title}</h3>
                                <div className="fr-plan__price-row">
                                    <span className="fr-plan__price">{plan.priceLabel}</span>
                                    <span className="fr-plan__period">{plan.period}</span>
                                </div>
                            </div>
                            <ul className="fr-plan__features">
                                {plan.features.map(f => (
                                    <li key={f} className="fr-plan__feat">
                                        <span className="fr-plan__check" aria-hidden="true">✓</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                className={`fr-plan__btn${plan.featured ? ' fr-plan__btn--primary' : ''}`}
                                onClick={() => setSelected(plan)}
                            >
                                Select Plan
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Payment Modal ──────────────────── */}
            {selectedPlan && (
                <PaymentModal
                    plan={selectedPlan}
                    membership={membership}
                    onClose={() => setSelected(null)}
                    onMembershipUpdate={handleMembershipUpdate}
                />
            )}
        </div>
    );
}

export default FeeRenewalPage;
