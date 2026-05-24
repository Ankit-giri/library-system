import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../../api/axios';
import './AdminPlansPage.css';

const EMPTY_PLAN = {
    name: '',
    displayName: '',
    price: '',
    durationDays: '',
    description: '',
    features: '',
    badgeText: '',
    featured: false,
    active: true,
};

function PlanModal({ plan, onSave, onClose, saving }) {
    const isEdit = Boolean(plan?.id);
    const [form, setForm] = useState(() => plan
        ? { ...plan, features: (plan.features ?? []).join('\n'), price: String(plan.price), durationDays: String(plan.durationDays) }
        : { ...EMPTY_PLAN });

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.displayName.trim()) { toast.error('Display name is required'); return; }
        if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) { toast.error('Price must be a positive number'); return; }
        if (!form.durationDays || isNaN(Number(form.durationDays)) || Number(form.durationDays) <= 0) { toast.error('Duration must be a positive number'); return; }

        onSave({
            ...form,
            price: Number(form.price),
            durationDays: Number(form.durationDays),
            features: form.features.split('\n').map(f => f.trim()).filter(Boolean),
        });
    };

    return (
        <div className="apl-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="apl-modal">
                <div className="apl-modal__hd">
                    <div>
                        <h2 className="apl-modal__title">{isEdit ? 'Edit Plan' : 'New Plan'}</h2>
                        <p className="apl-modal__sub">{isEdit ? `Editing "${plan.displayName}"` : 'Create a new membership plan'}</p>
                    </div>
                    <button className="apl-modal__close" onClick={onClose}>✕</button>
                </div>

                <form className="apl-modal__body" onSubmit={handleSubmit}>
                    <div className="apl-form-grid">
                        {!isEdit && (
                            <div className="apl-field apl-field--full">
                                <label className="apl-label">Plan ID <span className="apl-hint">(uppercase, no spaces e.g. MONTHLY)</span></label>
                                <input className="apl-input" value={form.name} onChange={e => set('name', e.target.value.toUpperCase().replace(/\s/g, '_'))} placeholder="MONTHLY" required />
                            </div>
                        )}
                        <div className="apl-field">
                            <label className="apl-label">Display Name</label>
                            <input className="apl-input" value={form.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Monthly" required />
                        </div>
                        <div className="apl-field">
                            <label className="apl-label">Price (₹)</label>
                            <input className="apl-input" type="number" min="1" step="1" value={form.price} onChange={e => set('price', e.target.value)} placeholder="199" required />
                        </div>
                        <div className="apl-field">
                            <label className="apl-label">Duration (days)</label>
                            <input className="apl-input" type="number" min="1" step="1" value={form.durationDays} onChange={e => set('durationDays', e.target.value)} placeholder="30" required />
                        </div>
                        <div className="apl-field">
                            <label className="apl-label">Badge Text <span className="apl-hint">(optional, e.g. Best Value)</span></label>
                            <input className="apl-input" value={form.badgeText ?? ''} onChange={e => set('badgeText', e.target.value)} placeholder="Best Value" />
                        </div>
                        <div className="apl-field apl-field--full">
                            <label className="apl-label">Description</label>
                            <input className="apl-input" value={form.description ?? ''} onChange={e => set('description', e.target.value)} placeholder="Short plan description" />
                        </div>
                        <div className="apl-field apl-field--full">
                            <label className="apl-label">Features <span className="apl-hint">(one per line)</span></label>
                            <textarea className="apl-textarea" rows={4} value={form.features} onChange={e => set('features', e.target.value)} placeholder={'30 days full access\nSeat booking\nDigital resources'} />
                        </div>
                        <div className="apl-field apl-field--full apl-checkrow">
                            <label className="apl-check">
                                <input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} />
                                <span>Mark as featured plan</span>
                            </label>
                            {isEdit && (
                                <label className="apl-check">
                                    <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
                                    <span>Active (visible to students)</span>
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="apl-modal__ft">
                        <button type="button" className="apl-btn apl-btn--ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="apl-btn apl-btn--primary" disabled={saving}>
                            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Plan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DeactivateModal({ plan, onConfirm, onClose, saving }) {
    return (
        <div className="apl-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="apl-modal apl-modal--sm">
                <div className="apl-modal__hd">
                    <h2 className="apl-modal__title">Deactivate Plan</h2>
                    <button className="apl-modal__close" onClick={onClose}>✕</button>
                </div>
                <div className="apl-modal__body">
                    <p className="apl-modal__text">
                        Deactivating <strong>{plan.displayName}</strong> will hide it from students.
                        Existing memberships are unaffected.
                    </p>
                    <div className="apl-modal__ft">
                        <button className="apl-btn apl-btn--ghost" onClick={onClose}>Cancel</button>
                        <button className="apl-btn apl-btn--danger" onClick={onConfirm} disabled={saving}>
                            {saving ? 'Deactivating…' : 'Deactivate'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AdminPlansPage() {
    const [plans, setPlans]           = useState([]);
    const [loading, setLoading]       = useState(true);
    const [saving, setSaving]         = useState(false);
    const [editPlan, setEditPlan]     = useState(null);
    const [showNew, setShowNew]       = useState(false);
    const [deactivate, setDeactivate] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/api/admin/plans');
            setPlans(data);
        } catch {
            toast.error('Failed to load plans');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreate = async (dto) => {
        setSaving(true);
        try {
            await api.post('/api/admin/plans', dto);
            toast.success(`Plan "${dto.displayName}" created`);
            setShowNew(false);
            load();
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Failed to create plan');
        } finally { setSaving(false); }
    };

    const handleUpdate = async (dto) => {
        setSaving(true);
        try {
            await api.put(`/api/admin/plans/${dto.id}`, dto);
            toast.success(`Plan "${dto.displayName}" updated`);
            setEditPlan(null);
            load();
        } catch (err) {
            toast.error(err?.response?.data?.message ?? 'Failed to update plan');
        } finally { setSaving(false); }
    };

    const handleDeactivate = async () => {
        setSaving(true);
        try {
            await api.delete(`/api/admin/plans/${deactivate.id}`);
            toast.success(`"${deactivate.displayName}" deactivated`);
            setDeactivate(null);
            load();
        } catch {
            toast.error('Failed to deactivate plan');
        } finally { setSaving(false); }
    };

    return (
        <div className="apl-root">
            <div className="apl-hd">
                <div>
                    <h1 className="apl-hd__title">Membership Plans</h1>
                    <p className="apl-hd__sub">Manage plans available to students on the Fee Renewal page.</p>
                </div>
                <button className="apl-btn apl-btn--primary" onClick={() => setShowNew(true)}>+ New Plan</button>
            </div>

            {loading ? (
                <div className="apl-grid">
                    {[1,2,3,4].map(i => <div key={i} className="apl-skel-card" />)}
                </div>
            ) : plans.length === 0 ? (
                <div className="apl-empty">
                    <div className="apl-empty__icon">💳</div>
                    <p className="apl-empty__title">No plans yet</p>
                    <p className="apl-empty__sub">Create your first membership plan.</p>
                </div>
            ) : (
                <div className="apl-grid">
                    {plans.map(plan => (
                        <div key={plan.id} className={`apl-card${plan.featured ? ' apl-card--featured' : ''}${!plan.active ? ' apl-card--inactive' : ''}`}>
                            <div className="apl-card__head">
                                <div>
                                    <p className="apl-card__name">{plan.displayName}</p>
                                    <p className="apl-card__id">{plan.name} · {plan.durationDays}d</p>
                                </div>
                                <div className="apl-card__badges">
                                    {plan.featured && <span className="apl-badge apl-badge--featured">Featured</span>}
                                    {!plan.active && <span className="apl-badge apl-badge--inactive">Inactive</span>}
                                </div>
                            </div>

                            <p className="apl-card__price">
                                ₹{Number(plan.price).toLocaleString('en-IN')}
                                {plan.badgeText && <span className="apl-card__badge-text">{plan.badgeText}</span>}
                            </p>

                            {plan.description && <p className="apl-card__desc">{plan.description}</p>}

                            {plan.features?.length > 0 && (
                                <ul className="apl-card__features">
                                    {plan.features.map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                            )}

                            <div className="apl-card__actions">
                                <button className="apl-action-btn apl-action-btn--edit" onClick={() => setEditPlan(plan)}>Edit</button>
                                {plan.active && (
                                    <button className="apl-action-btn apl-action-btn--deactivate" onClick={() => setDeactivate(plan)}>Deactivate</button>
                                )}
                                {!plan.active && (
                                    <button className="apl-action-btn apl-action-btn--activate" onClick={() => handleUpdate({ ...plan, active: true, features: plan.features ?? [] })}>Activate</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showNew && <PlanModal onSave={handleCreate} onClose={() => setShowNew(false)} saving={saving} />}
            {editPlan && <PlanModal plan={editPlan} onSave={handleUpdate} onClose={() => setEditPlan(null)} saving={saving} />}
            {deactivate && <DeactivateModal plan={deactivate} onConfirm={handleDeactivate} onClose={() => setDeactivate(null)} saving={saving} />}
        </div>
    );
}
