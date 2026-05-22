import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import './Layout.css';

function Layout({ children }) {
    const { pathname } = useLocation();
    const mainRef = useRef(null);

    /* Scroll to top + re-trigger fade-in on route change */
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        const el = mainRef.current;
        if (!el) return;
        el.classList.remove('page-enter');
        void el.offsetWidth; /* force reflow */
        el.classList.add('page-enter');
    }, [pathname]);

    return (
        <div className="lib-layout">
            <Navbar />
            <main ref={mainRef} className="lib-main page-enter">
                {children ?? <Outlet />}
            </main>
            <Footer />
        </div>
    );
}

export default Layout;
