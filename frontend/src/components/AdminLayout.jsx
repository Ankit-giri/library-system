import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './AdminLayout.css';

function getInitials(name) {
    if (!name) return 'A';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

const Icons = {
    dashboard: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <rect x="1" y="1" width="8" height="8" rx="1.5"/>
            <rect x="11" y="1" width="8" height="8" rx="1.5"/>
            <rect x="1" y="11" width="8" height="8" rx="1.5"/>
            <rect x="11" y="11" width="8" height="8" rx="1.5"/>
        </svg>
    ),
    students: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fillRule="evenodd" d="M10 9a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0H2z" clipRule="evenodd"/>
        </svg>
    ),
    bookings: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm2 5h8a1 1 0 010 2H6a1 1 0 010-2zm0 4h5a1 1 0 010 2H6a1 1 0 010-2z"/>
        </svg>
    ),
    seats: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 8h14v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z"/>
        </svg>
    ),
    reports: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path d="M2 11h4v7H2v-7zm6-4h4v11H8V7zm6-4h4v15h-4V3z"/>
        </svg>
    ),
    email: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
        </svg>
    ),
    plans: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
        </svg>
    ),
    menu: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="22" height="22">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
    ),
    close: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
    ),
    chevronUp: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd"/>
        </svg>
    ),
    chevronDown: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
    ),
    logout: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 000-2H4V5h6a1 1 0 000-2H3zm10.293 4.293a1 1 0 011.414 0L17 9.586l-2.293 2.293a1 1 0 01-1.414-1.414L14.586 9H9a1 1 0 110-2h5.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd"/>
        </svg>
    ),
    profile: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M10 9a4 4 0 100-8 4 4 0 000 8zm-8 9a8 8 0 0116 0H2z" clipRule="evenodd"/>
        </svg>
    ),
    settings: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
        </svg>
    ),
};

const NAV_LINKS = [
    { to: '/admin',          label: 'Dashboard',    icon: 'dashboard', exact: true },
    { to: '/admin/students', label: 'Students',     icon: 'students'              },
    { to: '/admin/bookings', label: 'Bookings',     icon: 'bookings'              },
    { to: '/admin/seats',    label: 'Seats',        icon: 'seats'                 },
    { to: '/admin/reports',  label: 'Reports',      icon: 'reports'               },
    { to: '/admin/email',    label: 'Email Center', icon: 'email'                 },
    { to: '/admin/plans',    label: 'Plans',        icon: 'plans'                 },
];

const THEME_OPTIONS = [
    { value: 'light',  label: 'Light',   icon: '☀️' },
    { value: 'dark',   label: 'Dark',    icon: '🌙' },
    { value: 'system', label: 'System',  icon: '💻' },
];

function AdminLayout() {
    const { currentUser, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const profileRef = useRef(null);

    useEffect(() => {
        function onClickOutside(e) {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
                setSettingsOpen(false);
            }
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const handleLogout = () => {
        setProfileOpen(false);
        logout();
        navigate('/login');
    };

    const closeSidebar = () => setSidebarOpen(false);

    const toggleProfile = () => {
        setProfileOpen(v => !v);
        if (profileOpen) setSettingsOpen(false);
    };

    return (
        <div className="al-root">
            <div
                className={`al-overlay${sidebarOpen ? ' al-overlay--on' : ''}`}
                onClick={closeSidebar}
                aria-hidden="true"
            />

            <aside className={`al-sidebar${sidebarOpen ? ' al-sidebar--open' : ''}`}>
                <div className="al-sidebar__head">
                    <div className="al-brand">
                        <span className="al-brand__icon">📚</span>
                        <span className="al-brand__text">LibraryMS</span>
                    </div>
                    <button className="al-icon-btn al-sidebar__close d-lg-none" onClick={closeSidebar} aria-label="Close menu">
                        {Icons.close}
                    </button>
                </div>

                <nav className="al-nav">
                    <p className="al-nav__section">Navigation</p>
                    {NAV_LINKS.map(({ to, label, icon, exact }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={exact}
                            className={({ isActive }) =>
                                `al-nav__item${isActive ? ' al-nav__item--active' : ''}`
                            }
                            onClick={closeSidebar}
                        >
                            <span className="al-nav__icon">{Icons[icon]}</span>
                            <span className="al-nav__label">{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* ── Profile footer ── */}
                <div className="al-profile-footer" ref={profileRef}>
                    {/* Dropdown menu (above the button) */}
                    {profileOpen && (
                        <div className="al-profile-menu" role="menu">
                            <div className="al-profile-menu__header">
                                <p className="al-profile-menu__name">{currentUser?.fullName || 'Admin'}</p>
                                <p className="al-profile-menu__email">{currentUser?.email}</p>
                            </div>
                            <div className="al-profile-menu__divider" />

                            <button
                                className="al-profile-menu__item"
                                onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                            >
                                <span className="al-profile-menu__icon">{Icons.profile}</span>
                                Profile
                            </button>

                            <button
                                className={`al-profile-menu__item${settingsOpen ? ' al-profile-menu__item--active' : ''}`}
                                onClick={() => setSettingsOpen(v => !v)}
                            >
                                <span className="al-profile-menu__icon">{Icons.settings}</span>
                                Settings
                                <span className="al-profile-menu__arrow">
                                    {settingsOpen ? Icons.chevronUp : Icons.chevronDown}
                                </span>
                            </button>

                            {settingsOpen && (
                                <div className="al-theme-picker">
                                    <p className="al-theme-picker__label">Appearance</p>
                                    <div className="al-theme-picker__row">
                                        {THEME_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                className={`al-theme-btn${theme === opt.value ? ' al-theme-btn--active' : ''}`}
                                                onClick={() => setTheme(opt.value)}
                                            >
                                                <span>{opt.icon}</span>
                                                <span>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="al-profile-menu__divider" />
                            <button className="al-profile-menu__item al-profile-menu__item--danger" onClick={handleLogout}>
                                <span className="al-profile-menu__icon">{Icons.logout}</span>
                                Logout
                            </button>
                        </div>
                    )}

                    {/* Profile trigger button */}
                    <button
                        className={`al-profile-trigger${profileOpen ? ' al-profile-trigger--open' : ''}`}
                        onClick={toggleProfile}
                        aria-haspopup="true"
                        aria-expanded={profileOpen}
                    >
                        <div className="al-profile-trigger__avatar">{getInitials(currentUser?.fullName)}</div>
                        <div className="al-profile-trigger__info">
                            <p className="al-profile-trigger__name">{currentUser?.fullName || 'Admin'}</p>
                            <span className="al-profile-trigger__role">Administrator</span>
                        </div>
                        <span className="al-profile-trigger__chevron">
                            {profileOpen ? Icons.chevronUp : Icons.chevronDown}
                        </span>
                    </button>
                </div>
            </aside>

            <div className="al-content">
                <header className="al-topbar d-lg-none">
                    <button className="al-icon-btn al-topbar__toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
                        {Icons.menu}
                    </button>
                    <span className="al-topbar__brand">Library Admin</span>
                </header>

                <main className="al-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AdminLayout;
