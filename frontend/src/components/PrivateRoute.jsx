import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PrivateRoute({ children }) {
    const { isAuthenticated } = useAuth();
    const { pathname, search } = useLocation();

    if (!isAuthenticated) {
        const returnTo = encodeURIComponent(pathname + search);
        return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
    }

    return children;
}

export default PrivateRoute;
