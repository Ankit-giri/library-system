import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
    return (
        <div className="home-page page-enter">
            <div className="home-hero glass-card">
                <h1 className="home-title">Library Seat Booking</h1>
                <p className="home-subtitle">
                    Book your study seat, manage renewals, and stay updated — all in one place.
                </p>
                <div className="home-actions">
                    <Link to="/login" className="btn btn-primary">Sign In</Link>
                    <Link to="/register" className="btn btn-outline-primary ms-3">Register</Link>
                </div>
            </div>
        </div>
    );
}

export default Home;
