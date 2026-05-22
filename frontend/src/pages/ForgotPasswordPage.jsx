import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import '../styles/auth.css';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [devToken, setDevToken] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        try {
            const { data } = await api.post('/api/auth/forgot-password', { email });
            setSent(true);
            setDevToken(data.data?.devToken ?? '');
            toast.success('Reset instructions sent.');
        } catch (err) {
            const msg = err?.response?.data?.message ?? 'Something went wrong.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-split">
                <div className="auth-split__form">
                    <div className="auth-card">
                        <div className="auth-card__logo">
                            <span className="auth-logo-icon">📚</span>
                            <span className="auth-logo-text">LibraryOS</span>
                        </div>

                        <h1 className="auth-card__title">Forgot Password</h1>
                        <p className="auth-card__sub">
                            Enter your registered email and we'll send you a reset link.
                        </p>

                        {sent ? (
                            <div>
                                <div className="auth-alert" style={{ background: '#f0fdf4', borderColor: '#86efac', color: '#166534' }} role="status">
                                    ✅ Reset link sent to <strong>{email}</strong>
                                </div>

                                {devToken && (
                                    <div className="auth-alert" style={{ background: '#fefce8', borderColor: '#fde047', color: '#854d0e', marginTop: 12 }}>
                                        <strong>Dev mode — your reset token:</strong>
                                        <div style={{ fontFamily: 'monospace', wordBreak: 'break-all', marginTop: 4, fontSize: '0.8rem' }}>
                                            {devToken}
                                        </div>
                                        <Link
                                            to={`/reset-password?token=${devToken}`}
                                            className="auth-link"
                                            style={{ display: 'block', marginTop: 8 }}
                                        >
                                            → Go to reset page with this token
                                        </Link>
                                    </div>
                                )}

                                <div className="auth-card__footer" style={{ marginTop: 24 }}>
                                    <Link to="/login" className="auth-link">← Back to login</Link>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} noValidate>
                                <div className="auth-field">
                                    <label className="auth-label" htmlFor="fp-email">Email Address</label>
                                    <input
                                        id="fp-email"
                                        type="email"
                                        className="auth-input"
                                        placeholder="you@college.edu"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>

                                <button type="submit" className="auth-btn-primary" disabled={loading || !email.trim()}>
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                            Sending…
                                        </>
                                    ) : 'Send Reset Link'}
                                </button>

                                <div className="auth-card__footer">
                                    <Link to="/login" className="auth-link">← Back to login</Link>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                <div className="auth-split__panel d-none d-lg-flex">
                    <div className="auth-panel">
                        <div className="auth-panel__content">
                            <h2 className="auth-panel__title">Reset your<br />password</h2>
                            <p className="auth-panel__sub">
                                We'll send a secure link to your email. Follow the link to set a new password.
                            </p>
                        </div>
                        <div className="auth-panel__decoration" />
                    </div>
                </div>
            </div>
        </div>
    );
}
