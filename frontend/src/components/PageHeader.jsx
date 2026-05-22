import { Link } from 'react-router-dom';
import './PageHeader.css';

/**
 * breadcrumbs: [{ label: 'Home', to: '/' }, { label: 'My Bookings' }]
 * actions: JSX node rendered in the top-right (e.g. a <Button>)
 */
function PageHeader({ title, subtitle, breadcrumbs = [], actions }) {
    return (
        <div className="lib-page-header">
            {breadcrumbs.length > 0 && (
                <nav aria-label="breadcrumb" className="lib-breadcrumb-nav">
                    <ol className="breadcrumb mb-0">
                        {breadcrumbs.map((crumb, i) => {
                            const isLast = i === breadcrumbs.length - 1;
                            return isLast ? (
                                <li
                                    key={i}
                                    className="breadcrumb-item active lib-bc-item"
                                    aria-current="page"
                                >
                                    {crumb.label}
                                </li>
                            ) : (
                                <li key={i} className="breadcrumb-item lib-bc-item">
                                    <Link to={crumb.to} className="lib-bc-link">
                                        {crumb.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ol>
                </nav>
            )}

            <div className="lib-page-header__row">
                <div className="lib-page-header__copy">
                    <h1 className="lib-page-title">{title}</h1>
                    {subtitle && <p className="lib-page-subtitle">{subtitle}</p>}
                </div>
                {actions && <div className="lib-page-header__actions">{actions}</div>}
            </div>
        </div>
    );
}

export default PageHeader;
