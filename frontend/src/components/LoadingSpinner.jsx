const SIZE = { sm: '1.25rem', md: '2rem', lg: '3rem' };

function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
    const dim = SIZE[size] ?? SIZE.md;
    return (
        <div
            className="d-flex flex-column align-items-center justify-content-center py-5 w-100"
            role="status"
            aria-live="polite"
        >
            <div
                className="spinner-border text-primary"
                style={{ width: dim, height: dim, borderWidth: size === 'sm' ? '2px' : '3px' }}
            >
                <span className="visually-hidden">{text}</span>
            </div>
            {text && <p className="mt-3 mb-0 text-muted small">{text}</p>}
        </div>
    );
}

export default LoadingSpinner;
