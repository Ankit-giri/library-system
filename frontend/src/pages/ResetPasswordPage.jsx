import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import '../styles/auth.css';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') ?? '';

    const [fields, setFields] = useState({ newPassword: '', confirmPassword: '' });
    const [showPw, setShowPw] = useState(false);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const validate = () => {
        const e = {};
        if (!fields.newPassword) e.newPassword = 'Password is required.';
        else if (fields.newPassword.length < 8) e.newPassword = 'Password must be at least 8 characters.';
        if (fields.confirmPassword !== fields.newPassword) e.confirmPassword = 'Passwords do not match.';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        if (!token) { toast.error('Invalid or missing reset token.'); return; }

        setLoading(true);
        try {
            await api.post('/api/auth/reset-password', { token, newPassword: fields.newPassword });
            toast.success('Password reset successfully! Please log in.');
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            const msg = err?.response?.data?.message ?? 'Reset failed. The link may have expired.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="auth-page">
                <div className="auth-split">
                    <div className="auth-split__form">
                        <div className="auth-card">
                            <h1 className="auth-card__title">Invalid Link</h1>
                            <p className="auth-card__sub">This reset link is missing or invalid.</p>
                            <Link to="/forgot-password" className="auth-btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                                Request a new link
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-split">
                <div className="auth-split__form">
                    <div className="auth-card">
                        <div className="auth-card__logo">
                            <span className="auth-logo-icon">📚</span>
                            <span className="auth-logo-text">LibraryOS</span>
                        </div>

                        <h1 className="auth-card__title">Set New Password</h1>
                        <p className="auth-card__sub">Choose a strong password for your account.</p>

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="auth-field">
                                <label className="auth-label" htmlFor="rp-password">New Password</label>
                                <div className="auth-input-wrap">
                                    <input
                                        id="rp-password"
                                        name="newPassword"
                                        type={showPw ? 'text' : 'password'}
                                        className={`auth-input${errors.newPassword ? ' auth-input--error' : ''}`}
                                        placeholder="Min. 8 characters"
                                        value={fields.newPassword}
                                        onChange={e => {
                                            setFields(f => ({ ...f, newPassword: e.target.value }));
                                            if (errors.newPassword) setErrors(p => ({ ...p, newPassword: '' }));
                                        }}
                                        autoFocus
                                    />
                                    <button type="button" className="auth-eye-btn"
                                        onClick={() => setShowPw(v => !v)}
                                        aria-label={showPw ? 'Hide' : 'Show'}>
                                        {showPw ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {errors.newPassword && <span className="auth-field-error">{errors.newPassword}</span>}
                            </div>

                            <div className="auth-field">
                                <label className="auth-label" htmlFor="rp-confirm">Confirm Password</label>
                                <input
                                    id="rp-confirm"
                                    name="confirmPassword"
                                    type={showPw ? 'text' : 'password'}
                                    className={`auth-input${errors.confirmPassword ? ' auth-input--error' : ''}`}
                                    placeholder="Repeat password"
                                    value={fields.confirmPassword}
                                    onChange={e => {
                                        setFields(f => ({ ...f, confirmPassword: e.target.value }));
                                        if (errors.confirmPassword) setErrors(p => ({ ...p, confirmPassword: '' }));
                                    }}
                                />
                                {errors.confirmPassword && <span className="auth-field-error">{errors.confirmPassword}</span>}
                            </div>

                            <button type="submit" className="auth-btn-primary" disabled={loading}>
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                        Saving…
                                    </>
                                ) : 'Reset Password'}
                            </button>
                        </form>

                        <div className="auth-card__footer">
                            <Link to="/login" className="auth-link">← Back to login</Link>
                        </div>
                    </div>
                </div>

                <div className="auth-split__panel d-none d-lg-flex">
                    <div className="auth-panel">
                        <div className="auth-panel__content">
                            <h2 className="auth-panel__title">Almost<br />there</h2>
                            <p className="auth-panel__sub">Set a new password to regain access to your account.</p>
                        </div>
                        <div className="auth-panel__decoration" />
                    </div>
                </div>
            </div>
        </div>
    );
}
