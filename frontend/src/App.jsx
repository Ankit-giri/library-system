import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';

/* Layout + route guards */
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

/* Public pages (no Layout) */
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

/* Student pages (inside Layout) */
import StudentDashboard from './pages/StudentDashboard';
import SeatBookingPage from './pages/SeatBookingPage';
import MyBookingsPage from './pages/MyBookingsPage';
import FeeRenewalPage from './pages/FeeRenewalPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

/* Admin pages (inside Layout) */
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudentsPage from './pages/admin/AdminStudentsPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminSeatsPage from './pages/admin/AdminSeatsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminEmailPage from './pages/admin/AdminEmailPage';
import AdminPlansPage from './pages/admin/AdminPlansPage';

function App() {
    return (
        <ThemeProvider>
        <AuthProvider>
            <NotificationProvider>
                <BrowserRouter>
                    <ToastContainer position="top-right" autoClose={3000} />
                    <Routes>
                        {/* ── Public routes (no Navbar/Footer) ── */}
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />

                        {/* ── Student routes — wrapped in PrivateRoute + Layout ── */}
                        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                            <Route path="/dashboard" element={<StudentDashboard />} />
                            <Route path="/seat-booking" element={<SeatBookingPage />} />
                            <Route path="/my-bookings" element={<MyBookingsPage />} />
                            <Route path="/fee-renewal" element={<FeeRenewalPage />} />
                            <Route path="/notifications" element={<NotificationsPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                        </Route>

                        {/* ── Admin routes — wrapped in AdminRoute + AdminLayout (sidebar) ── */}
                        <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/admin/students" element={<AdminStudentsPage />} />
                            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
                            <Route path="/admin/seats" element={<AdminSeatsPage />} />
                            <Route path="/admin/reports" element={<AdminReportsPage />} />
                            <Route path="/admin/email" element={<AdminEmailPage />} />
                            <Route path="/admin/plans" element={<AdminPlansPage />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </BrowserRouter>
            </NotificationProvider>
        </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
