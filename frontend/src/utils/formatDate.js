import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export function formatDate(date, pattern = 'dd MMM yyyy') {
    return format(new Date(date), pattern);
}

export function formatDateTime(date) {
    return format(new Date(date), 'dd MMM yyyy, hh:mm a');
}

export function formatTimeAgo(date) {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatRelativeDay(date) {
    const d = new Date(date);
    if (isToday(d)) return `Today, ${format(d, 'hh:mm a')}`;
    if (isYesterday(d)) return `Yesterday, ${format(d, 'hh:mm a')}`;
    return format(d, 'dd MMM yyyy');
}
