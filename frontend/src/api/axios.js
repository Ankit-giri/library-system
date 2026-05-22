import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('libraryToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error.config?.url ?? '';
        const isAuthEndpoint = url.includes('/api/auth/');
        if (error.response?.status === 401 && !isAuthEndpoint) {
            localStorage.removeItem('libraryToken');
            localStorage.removeItem('libraryRole');
            localStorage.removeItem('libraryUser');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
