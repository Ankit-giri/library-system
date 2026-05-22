import PageHeader from '../components/PageHeader';

function SettingsPage() {
    return (
        <div className="container-fluid px-4 py-4">
            <PageHeader
                title="Settings"
                subtitle="Manage your account preferences"
                breadcrumbs={[
                    { label: 'Dashboard', to: '/dashboard' },
                    { label: 'Settings' },
                ]}
            />

            <div className="row justify-content-center">
                <div className="col-12 col-md-8 col-lg-6">
                    <div className="card shadow-sm border-0">
                        <div className="card-body p-4 text-center py-5">
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
                            <h5 className="mb-2">Settings</h5>
                            <p className="text-muted mb-0">Account settings and preferences will be available here.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsPage;
