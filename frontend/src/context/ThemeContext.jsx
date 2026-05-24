import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'system', setTheme: () => {} });

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');

    useEffect(() => {
        function apply(t) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const isDark = t === 'dark' || (t === 'system' && prefersDark);
            document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        }

        apply(theme);
        localStorage.setItem('theme', theme);

        if (theme === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            mq.addEventListener('change', () => apply('system'));
            return () => mq.removeEventListener('change', () => apply('system'));
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
