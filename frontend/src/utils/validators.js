export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone) {
    return /^[6-9]\d{9}$/.test(phone);
}

export function isStrongPassword(password) {
    return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);
}

export function isNotEmpty(value) {
    return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

export function validateLoginForm({ email, password }) {
    const errors = {};
    if (!isValidEmail(email)) errors.email = 'Enter a valid email address';
    if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters';
    return errors;
}

export function validateRegisterForm({ name, email, phone, password }) {
    const errors = {};
    if (!isNotEmpty(name)) errors.name = 'Name is required';
    if (!isValidEmail(email)) errors.email = 'Enter a valid email address';
    if (phone && !isValidPhone(phone)) errors.phone = 'Enter a valid 10-digit phone number';
    if (!isStrongPassword(password)) errors.password = 'Password must be 8+ chars with uppercase and number';
    return errors;
}
