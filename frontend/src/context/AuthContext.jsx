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

    const login = useCallback(async (email, password) => {
        // ISSUE-1 fix: single /api/auth/login endpoint handles all roles
        const { data } = await api.post('/api/auth/login', { email, password });
        // ISSUE-2 fix: API returns ApiResponse<AuthResponse> wrapper; real data is at data.data
        const auth = data.data;

        // Set token in localStorage before fetching profile so the interceptor picks it up
        localStorage.setItem('libraryToken', auth.token);
        localStorage.setItem('libraryRole', auth.role);
        setToken(auth.token);

        // Fetch full profile to get fullName, studentId, email
        const profileRes = await api.get('/api/auth/me');
        const profile = profileRes.data.data;
        const user = {
            userId: auth.userId,
            role: auth.role,
            expiresAt: auth.expiresAt,
            fullName: profile.fullName,
            studentId: profile.studentId,
            email: profile.email,
        };
        localStorage.setItem('libraryUser', JSON.stringify(user));
        setCurrentUser(user);
        return auth;
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
