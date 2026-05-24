import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';

function InfoRow({ label, value }) {
    return (
        <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ minWidth: 140, fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{label}</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{value || '—'}</span>
        </div>
    );
}

function ProfilePage() {
    const { currentUser, isAdmin } = useAuth();
    const dashboardPath = isAdmin ? '/admin' : '/dashboard';

    return (
        <div className="container-fluid px-4 py-4">
            <PageHeader
                title="My Profile"
                subtitle="Your account details"
                breadcrumbs={[
                    { label: 'Dashboard', to: dashboardPath },
                    { label: 'Profile' },
                ]}
            />

            <div className="row justify-content-center">
                <div className="col-12 col-md-8 col-lg-6">
                    <div className="card border-0" style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)' }}>
                        <div className="card-body p-4">
                            <div className="d-flex align-items-center gap-3 mb-4">
                                <div style={{
                                    width: 64, height: 64, borderRadius: '50%',
                                    background: 'var(--primary, #2563eb)',
                                    color: '#fff', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700,
                                }}>
                                    {currentUser?.fullName
                                        ? currentUser.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                                        : 'U'}
                                </div>
                                <div>
                                    <h5 className="mb-0">{currentUser?.fullName || 'User'}</h5>
                                    <span className={`badge ${currentUser?.role === 'ADMIN' ? 'bg-danger' : 'bg-primary'} mt-1`}>
                                        {currentUser?.role || 'STUDENT'}
                                    </span>
                                </div>
                            </div>

                            <InfoRow label="Full Name" value={currentUser?.fullName} />
                            <InfoRow label="Email" value={currentUser?.email} />
                            <InfoRow label="Student ID" value={currentUser?.studentId} />
                            <InfoRow label="Role" value={currentUser?.role} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;
