import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

function AdminRoute({ children }) {
    const { isAuthenticated, isAdmin } = useAuth();
    const { pathname, search } = useLocation();

    useEffect(() => {
        if (isAuthenticated && !isAdmin) {
            toast.error('Access Denied: Admin privileges required.', {
                toastId: 'admin-access-denied',
            });
        }
    }, [isAuthenticated, isAdmin]);

    if (!isAuthenticated) {
        const returnTo = encodeURIComponent(pathname + search);
        return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
    }

    if (!isAdmin) return <Navigate to="/dashboard" replace />;

    return children;
}

export default AdminRoute;
