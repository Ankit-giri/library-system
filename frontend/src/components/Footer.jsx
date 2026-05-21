function Footer() {
    return (
        <footer className="lib-footer">
            <p className="lib-footer__text">
                © {new Date().getFullYear()} Library Management System
                <span className="lib-footer__sep">|</span>
                Student Portal
            </p>
        </footer>
    );
}

export default Footer;
