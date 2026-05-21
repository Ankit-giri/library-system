import { useState, useCallback } from 'react';
import api from '../api/axios';

export function useBooking() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/api/bookings/my');
            setBookings(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch bookings');
        } finally {
            setLoading(false);
        }
    }, []);

    const createBooking = useCallback(async (payload) => {
        const { data } = await api.post('/api/bookings', payload);
        setBookings((prev) => [data, ...prev]);
        return data;
    }, []);

    const cancelBooking = useCallback(async (id) => {
        await api.put(`/api/bookings/${id}/cancel`);
        setBookings((prev) =>
            prev.map((b) => (b.id === id ? { ...b, status: 'CANCELLED' } : b))
        );
    }, []);

    return { bookings, loading, error, fetchBookings, createBooking, cancelBooking };
}
