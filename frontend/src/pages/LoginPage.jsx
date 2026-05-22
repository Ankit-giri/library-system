import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';
import './LoginPage.css';

function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [isAdminMode, setIsAdminMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [fields, setFields] = useState({ identifier: '', password: '' });
    const [errors, setErrors] = useState({});

    const validate = () => {
        const errs = {};
        if (!fields.identifier.trim()) errs.identifier = 'Student ID or email is required.';
        if (!fields.password) errs.password = 'Password is required.';
        else if (fields.password.length < 8) errs.password = 'Password must be at least 8 characters.';
        return errs;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFields(f => ({ ...f, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        if (formError) setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setLoading(true);
        setFormError('');
        try {
            // login() uses /api/auth/login for all roles; role is determined by the JWT
            await login(fields.identifier, fields.password);
            toast.success(isAdminMode ? 'Admin login successful.' : 'Welcome back!');
            const returnTo = searchParams.get('returnTo');
            navigate(returnTo ? decodeURIComponent(returnTo) : '/dashboard', { replace: true });
        } catch (err) {
            const msg = err?.response?.data?.message ?? 'Invalid credentials. Please try again.';
            setFormError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setIsAdminMode(v => !v);
        setFormError('');
        setErrors({});
    };

    return (
        <div className="auth-page">
            <div className="auth-split">
                {/* ── Left: Form ── */}
                <div className="auth-split__form">
                    <div className="auth-card">
                        <div className="auth-card__logo">
                            <span className="auth-logo-icon">📚</span>
                            <span className="auth-logo-text">LibraryOS</span>
                        </div>

                        <h1 className="auth-card__title">
                            {isAdminMode ? 'Admin Login' : 'Welcome back'}
                        </h1>
                        <p className="auth-card__sub">
                            {isAdminMode
                                ? 'Sign in with your admin credentials.'
                                : 'Sign in to your student account.'}
                        </p>

                        {formError && (
                            <div className="auth-alert auth-alert--error" role="alert">
                                <span className="auth-alert__icon">⚠️</span>
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="auth-field">
                                <label className="auth-label" htmlFor="identifier">
                                    Email
                                </label>
                                <input
                                    id="identifier"
                                    name="identifier"
                                    type="email"
                                    className={`auth-input${errors.identifier ? ' auth-input--error' : ''}`}
                                    placeholder={isAdminMode ? 'admin@library.com' : 'you@college.edu'}
                                    value={fields.identifier}
                                    onChange={handleChange}
                                    autoComplete="username"
                                    autoFocus
                                />
                                {errors.identifier && (
                                    <span className="auth-field-error">{errors.identifier}</span>
                                )}
                            </div>

                            <div className="auth-field">
                                <label className="auth-label" htmlFor="password">Password</label>
                                <div className="auth-input-wrap">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        className={`auth-input${errors.password ? ' auth-input--error' : ''}`}
                                        placeholder="Min. 8 characters"
                                        value={fields.password}
                                        onChange={handleChange}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="auth-eye-btn"
                                        onClick={() => setShowPassword(v => !v)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {errors.password && (
                                    <span className="auth-field-error">{errors.password}</span>
                                )}
                            </div>

                            <button type="submit" className="auth-btn-primary" disabled={loading}>
                                {loading ? (
                                    <>
                                        <span
                                            className="spinner-border spinner-border-sm"
                                            role="status"
                                            aria-hidden="true"
                                        />
                                        Signing in…
                                    </>
                                ) : 'Sign In'}
                            </button>
                        </form>

                        <div className="auth-card__footer">
                            <p className="auth-card__link-row">
                                Don't have an account?{' '}
                                <Link to="/register" className="auth-link">Create one</Link>
                            </p>
                            <button type="button" className="auth-mode-toggle" onClick={switchMode}>
                                {isAdminMode ? '← Back to student login' : 'Admin login →'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Right: Info Panel (desktop only) ── */}
                <div className="auth-split__panel d-none d-lg-flex">
                    <div className="auth-panel">
                        <div className="auth-panel__content">
                            <h2 className="auth-panel__title">Your Library,<br />Anytime</h2>
                            <p className="auth-panel__sub">
                                Book seats, renew fees, and track your library activity — all in one place.
                            </p>
                            <div className="auth-panel__stats">
                                {[
                                    { value: '240',  label: 'Study Seats' },
                                    { value: '500+', label: 'Students' },
                                    { value: '6 AM', label: 'Opens Daily' },
                                    { value: '24/7', label: 'Online Booking' },
                                ].map(s => (
                                    <div key={s.label} className="auth-stat">
                                        <span className="auth-stat__value">{s.value}</span>
                                        <span className="auth-stat__label">{s.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="auth-panel__decoration" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
