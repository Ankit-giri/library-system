import { useState, useMemo } from 'react';

export function usePagination(items, pageSize = 10) {
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }, [items, page, pageSize]);

    const goTo = (p) => setPage(Math.min(Math.max(1, p), totalPages));
    const next = () => goTo(page + 1);
    const prev = () => goTo(page - 1);
    const reset = () => setPage(1);

    return { page, totalPages, paginated, goTo, next, prev, reset };
}
