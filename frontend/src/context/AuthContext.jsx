import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(() => {
        const stored = localStorage.getItem('libraryUser');
        return stored ? JSON.parse(stored) : null;
    });

    const [token, setToken] = useState(() => localStorage.getItem('libraryToken'));

    const isAuthenticated = !!token;
    const isAdmin = currentUser?.role === 'ADMIN';

    const login = useCallback(async (email, password, options = {}) => {
        const endpoint = options.isAdmin ? '/api/auth/admin/login' : '/api/auth/login';
        const { data } = await api.post(endpoint, { email, password });
        localStorage.setItem('libraryToken', data.token);
        localStorage.setItem('libraryRole', data.role);
        localStorage.setItem('libraryUser', JSON.stringify(data.user));
        setToken(data.token);
        setCurrentUser(data.user);
        return data;
    }, []);

    const register = useCallback(async (payload) => {
        const { data } = await api.post('/api/auth/register', payload);
        return data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('libraryToken');
        localStorage.removeItem('libraryRole');
        localStorage.removeItem('libraryUser');
        setToken(null);
        setCurrentUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, isAuthenticated, isAdmin, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}

export default AuthContext;
