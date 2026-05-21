import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import '../styles/auth.css';
import './RegisterPage.css';

function getStrength(pwd) {
    if (!pwd) return null;
    const checks = [
        pwd.length >= 8,
        /[a-z]/.test(pwd),
        /[A-Z]/.test(pwd),
        /\d/.test(pwd),
        /[^A-Za-z0-9]/.test(pwd),
    ];
    const score = checks.filter(Boolean).length;
    if (score <= 2) return 'weak';
    if (score <= 3) return 'medium';
    return 'strong';
}

const STRENGTH_LABEL = { weak: 'Weak', medium: 'Medium', strong: 'Strong' };

function validateField(name, value, allFields) {
    switch (name) {
        case 'fullName':
            return value.trim().length < 2 ? 'Name must be at least 2 characters.' : '';
        case 'studentId':
            return !value.trim() ? 'Student ID is required.' : '';
        case 'email':
            return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Enter a valid email address.' : '';
        case 'password':
            return value.length < 8 ? 'Password must be at least 8 characters.' : '';
        case 'confirmPassword':
            return value !== allFields.password ? 'Passwords do not match.' : '';
        default: return '';
    }
}

const EMPTY = { fullName: '', studentId: '', email: '', password: '', confirmPassword: '' };

function RegisterPage() {
    const { register, login } = useAuth();
    const navigate = useNavigate();

    const [fields, setFields] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const strength = getStrength(fields.password);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updated = { ...fields, [name]: value };
        setFields(updated);

        if (touched[name]) {
            setErrors(prev => ({ ...prev, [name]: validateField(name, value, updated) }));
        }
        // Live-validate confirm whenever password changes
        if (name === 'password' && touched.confirmPassword) {
            setErrors(prev => ({
                ...prev,
                confirmPassword: validateField('confirmPassword', updated.confirmPassword, updated),
            }));
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        setErrors(prev => ({ ...prev, [name]: validateField(name, value, fields) }));
    };

    const validateAll = () => {
        const allTouched = Object.fromEntries(Object.keys(fields).map(k => [k, true]));
        setTouched(allTouched);
        const errs = Object.fromEntries(
            Object.keys(fields).map(k => [k, validateField(k, fields[k], fields)])
        );
        setErrors(errs);
        return !Object.values(errs).some(Boolean);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateAll()) return;

        setLoading(true);
        try {
            await register({
                name: fields.fullName,
                studentId: fields.studentId,
                email: fields.email,
                password: fields.password,
            });
            await login(fields.email, fields.password);
            toast.success('Account created! Welcome to LibraryOS 🎉');
            navigate('/dashboard', { replace: true });
        } catch (err) {
            const msg = err?.response?.data?.message ?? 'Registration failed. Please try again.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const fieldError = (name) =>
        touched[name] && errors[name] ? (
            <span className="auth-field-error">{errors[name]}</span>
        ) : null;

    const inputClass = (name) =>
        `auth-input${touched[name] && errors[name] ? ' auth-input--error' : ''}`;

    return (
        <div className="auth-page">
            <div className="auth-split">
                {/* ── Left: Form ── */}
                <div className="auth-split__form">
                    <div className="auth-card auth-card--wide">
                        <div className="auth-card__logo">
                            <span className="auth-logo-icon">📚</span>
                            <span className="auth-logo-text">LibraryOS</span>
                        </div>

                        <h1 className="auth-card__title">Create account</h1>
                        <p className="auth-card__sub">Join your campus library today.</p>

                        <form onSubmit={handleSubmit} noValidate>
                            {/* Full Name */}
                            <div className="auth-field">
                                <label className="auth-label" htmlFor="fullName">Full Name</label>
                                <input
                                    id="fullName" name="fullName" type="text"
                                    className={inputClass('fullName')}
                                    placeholder="Ankit Giri"
                                    value={fields.fullName}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    autoFocus
                                    autoComplete="name"
                                />
                                {fieldError('fullName')}
                            </div>

                            {/* Student ID + Email */}
                            <div className="auth-field-row">
                                <div className="auth-field">
                                    <label className="auth-label" htmlFor="studentId">Student ID</label>
                                    <input
                                        id="studentId" name="studentId" type="text"
                                        className={inputClass('studentId')}
                                        placeholder="STU2024001"
                                        value={fields.studentId}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        autoComplete="off"
                                    />
                                    {fieldError('studentId')}
                                </div>
                                <div className="auth-field">
                                    <label className="auth-label" htmlFor="email">Email</label>
                                    <input
                                        id="email" name="email" type="email"
                                        className={inputClass('email')}
                                        placeholder="you@college.edu"
                                        value={fields.email}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        autoComplete="email"
                                    />
                                    {fieldError('email')}
                                </div>
                            </div>

                            {/* Password */}
                            <div className="auth-field">
                                <label className="auth-label" htmlFor="password">Password</label>
                                <div className="auth-input-wrap">
                                    <input
                                        id="password" name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        className={inputClass('password')}
                                        placeholder="Min. 8 characters"
                                        value={fields.password}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button" className="auth-eye-btn"
                                        onClick={() => setShowPassword(v => !v)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {fieldError('password')}
                                {fields.password && strength && (
                                    <div className="auth-strength" aria-label={`Password strength: ${strength}`}>
                                        <div className="auth-strength__track">
                                            <div className={`auth-strength__fill auth-strength__fill--${strength}`} />
                                        </div>
                                        <span className={`auth-strength__label auth-strength__label--${strength}`}>
                                            {STRENGTH_LABEL[strength]}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div className="auth-field">
                                <label className="auth-label" htmlFor="confirmPassword">
                                    Confirm Password
                                </label>
                                <div className="auth-input-wrap">
                                    <input
                                        id="confirmPassword" name="confirmPassword"
                                        type={showConfirm ? 'text' : 'password'}
                                        className={inputClass('confirmPassword')}
                                        placeholder="Repeat your password"
                                        value={fields.confirmPassword}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button" className="auth-eye-btn"
                                        onClick={() => setShowConfirm(v => !v)}
                                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                    >
                                        {showConfirm ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {fieldError('confirmPassword')}
                            </div>

                            <button type="submit" className="auth-btn-primary" disabled={loading}>
                                {loading ? (
                                    <>
                                        <span
                                            className="spinner-border spinner-border-sm"
                                            role="status"
                                            aria-hidden="true"
                                        />
                                        Creating account…
                                    </>
                                ) : 'Create Account'}
                            </button>
                        </form>

                        <div className="auth-card__footer">
                            <p className="auth-card__link-row">
                                Already have an account?{' '}
                                <Link to="/login" className="auth-link">Sign in</Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Right: Info Panel (desktop only) ── */}
                <div className="auth-split__panel d-none d-lg-flex">
                    <div className="auth-panel">
                        <div className="auth-panel__content">
                            <h2 className="auth-panel__title">Join<br />LibraryOS</h2>
                            <p className="auth-panel__sub">
                                Reserve your seat, manage fees, and stay on top of your study schedule.
                            </p>
                            <ul className="auth-panel__features">
                                {[
                                    'Book seats up to 7 days in advance',
                                    'Track fee renewal deadlines',
                                    'Real-time seat availability',
                                    'Instant email notifications',
                                ].map(feat => (
                                    <li key={feat} className="auth-panel__feature">
                                        <span className="auth-feature-check">✓</span>
                                        {feat}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="auth-panel__decoration" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;
