import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
    logout: (
        <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h7a1 1 0 000-2H4V5h6a1 1 0 000-2H3zm10.293 4.293a1 1 0 011.414 0L17 9.586l-2.293 2.293a1 1 0 01-1.414-1.414L14.586 9H9a1 1 0 110-2h5.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd"/>
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
};

const NAV_LINKS = [
    { to: '/admin',          label: 'Dashboard',    icon: 'dashboard', exact: true },
    { to: '/admin/students', label: 'Students',     icon: 'students'              },
    { to: '/admin/bookings', label: 'Bookings',     icon: 'bookings'              },
    { to: '/admin/seats',    label: 'Seats',        icon: 'seats'                 },
    { to: '/admin/reports',  label: 'Reports',      icon: 'reports'               },
    { to: '/admin/email',    label: 'Email Center', icon: 'email'                 },
];

function AdminLayout() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const closeSidebar = () => setSidebarOpen(false);

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

                <div className="al-admin-card">
                    <div className="al-admin-card__avatar">{getInitials(currentUser?.fullName)}</div>
                    <div className="al-admin-card__info">
                        <p className="al-admin-card__name">{currentUser?.fullName || 'Admin'}</p>
                        <span className="al-admin-card__badge">Administrator</span>
                    </div>
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

                <div className="al-sidebar__footer">
                    <button className="al-logout-btn" onClick={handleLogout}>
                        <span className="al-nav__icon">{Icons.logout}</span>
                        <span>Logout</span>
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
