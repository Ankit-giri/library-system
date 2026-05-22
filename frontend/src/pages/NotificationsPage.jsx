import { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import PageHeader from '../components/PageHeader';
import './NotificationsPage.css';

function NotificationsPage() {
    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } =
        useNotifications();

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return (
        <div className="np-page">
            <PageHeader
                title="Notifications"
                subtitle="Your library alerts and updates"
                breadcrumbs={[
                    { label: 'Dashboard', to: '/dashboard' },
                    { label: 'Notifications' },
                ]}
                actions={
                    unreadCount > 0 ? (
                        <button className="np-mark-all-btn" onClick={markAllAsRead}>
                            Mark all as read ({unreadCount})
                        </button>
                    ) : null
                }
            />

            {notifications.length === 0 ? (
                <div className="np-empty">
                    <span className="np-empty__icon">🔔</span>
                    <p className="np-empty__title">No notifications yet</p>
                    <p className="np-empty__sub">
                        We'll let you know when something important happens.
                    </p>
                </div>
            ) : (
                <ul className="np-list">
                    {notifications.map((n) => (
                        <li
                            key={n.id}
                            className={`np-item${n.read ? '' : ' np-item--unread'}`}
                            onClick={() => !n.read && markAsRead(n.id)}
                            role={n.read ? undefined : 'button'}
                            tabIndex={n.read ? undefined : 0}
                            onKeyDown={(e) =>
                                !n.read && e.key === 'Enter' && markAsRead(n.id)
                            }
                        >
                            <div className="np-item__body">
                                <p className="np-item__title">{n.title}</p>
                                <p className="np-item__message">{n.message}</p>
                                <span className="np-item__time">
                                    {n.createdAt
                                        ? new Date(n.createdAt).toLocaleString('en-IN', {
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit',
                                          })
                                        : ''}
                                </span>
                            </div>
                            {!n.read && <span className="np-unread-dot" aria-label="Unread" />}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default NotificationsPage;
