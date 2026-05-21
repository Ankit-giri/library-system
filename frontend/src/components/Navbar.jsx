import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import './Navbar.css';

function BellIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    );
}

function navCls({ isActive }) {
    return `nav-link lib-nav-link${isActive ? ' active' : ''}`;
}

function Navbar() {
    const { currentUser, isAuthenticated, isAdmin, logout } = useAuth();
    const { unreadCount, fetchNotifications } = useNotifications();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchNotifications();
        const id = setInterval(fetchNotifications, 60_000);
        return () => clearInterval(id);
    }, [isAuthenticated, fetchNotifications]);

    useEffect(() => {
        function onScroll() { setScrolled(window.scrollY > 8); }
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        function onClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const handleLogout = () => {
        setDropdownOpen(false);
        logout();
        navigate('/login');
    };

    const initials = currentUser?.name
        ? currentUser.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
        : 'U';

    return (
        <nav className={`navbar navbar-expand-lg lib-navbar${scrolled ? ' lib-navbar--scrolled' : ''}`}>
            <div className="container-fluid px-4">
                {/* ── Logo ── */}
                <NavLink to="/" className="navbar-brand lib-brand">
                    <span className="lib-brand-icon">📚</span>
                    <span className="lib-brand-text">LibraryOS</span>
                </NavLink>

                {/* ── Mobile toggler ── */}
                <button
                    className="navbar-toggler lib-toggler border-0"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#libNavbar"
                    aria-controls="libNavbar"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="lib-toggler-bar" />
                    <span className="lib-toggler-bar" />
                    <span className="lib-toggler-bar" />
                </button>

                {/* ── Collapsible section ── */}
                <div className="collapse navbar-collapse" id="libNavbar">
                    {/* Center links */}
                    <ul className="navbar-nav mx-auto mb-2 mb-lg-0 lib-nav-links">
                        <li className="nav-item">
                            <NavLink to="/" end className={navCls}>Home</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/seat-booking" className={navCls}>Seat Booking</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/my-bookings" className={navCls}>My Bookings</NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/fee-renewal" className={navCls}>Fee Renewal</NavLink>
                        </li>
                        {isAdmin && (
                            <li className="nav-item">
                                <NavLink
                                    to="/admin"
                                    className={({ isActive }) =>
                                        `nav-link lib-nav-link lib-nav-admin${isActive ? ' active' : ''}`
                                    }
                                >
                                    Admin
                                </NavLink>
                            </li>
                        )}
                    </ul>

                    {/* Right controls */}
                    <div className="d-flex align-items-center gap-2">
                        {/* Notification bell */}
                        <NavLink to="/notifications" className="lib-bell" aria-label="Notifications">
                            <BellIcon />
                            {unreadCount > 0 && (
                                <span className="lib-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                            )}
                        </NavLink>

                        {/* Avatar + dropdown */}
                        <div className="lib-user-menu" ref={dropdownRef}>
                            <button
                                className="lib-avatar"
                                onClick={() => setDropdownOpen((v) => !v)}
                                aria-haspopup="true"
                                aria-expanded={dropdownOpen}
                                title={currentUser?.name || 'Account'}
                            >
                                {initials}
                            </button>

                            {dropdownOpen && (
                                <div className="lib-dropdown" role="menu">
                                    <div className="lib-dropdown__header">
                                        <span className="lib-dropdown__name">{currentUser?.name || 'User'}</span>
                                        <span className="lib-dropdown__email">{currentUser?.email}</span>
                                    </div>
                                    <div className="lib-dropdown__divider" />
                                    <NavLink
                                        to="/profile"
                                        className="lib-dropdown__item"
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        Profile
                                    </NavLink>
                                    <NavLink
                                        to="/settings"
                                        className="lib-dropdown__item"
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        Settings
                                    </NavLink>
                                    <div className="lib-dropdown__divider" />
                                    <button
                                        className="lib-dropdown__item lib-dropdown__item--danger"
                                        onClick={handleLogout}
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
