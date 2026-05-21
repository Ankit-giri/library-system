export function formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(amount);
}

export function formatAmount(amount) {
    return `₹${Number(amount).toLocaleString('en-IN')}`;
}
