import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        // ISSUE-3 fix: GET /api/notifications requires ?userId= param
        // Response is Page<NotificationDTO> so read .content
        if (!currentUser?.userId) return;
        const { data } = await api.get('/api/notifications', {
            params: { userId: currentUser.userId },
        });
        const items = data.content ?? [];
        setNotifications(items);
        setUnreadCount(items.filter((n) => !n.read).length);
    }, [currentUser?.userId]);

    const markAsRead = useCallback(async (id) => {
        // ISSUE-4 fix: PUT /api/notifications/{id}/read requires ?userId= param
        if (!currentUser?.userId) return;
        await api.put(`/api/notifications/${id}/read`, null, {
            params: { userId: currentUser.userId },
        });
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
    }, [currentUser?.userId]);

    const markAllAsRead = useCallback(async () => {
        // ISSUE-5 fix: PUT /api/notifications/read-all requires ?userId= param
        if (!currentUser?.userId) return;
        await api.put('/api/notifications/read-all', null, {
            params: { userId: currentUser.userId },
        });
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    }, [currentUser?.userId]);

    return (
        <NotificationContext.Provider
            value={{ notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
    return ctx;
}

export default NotificationContext;
