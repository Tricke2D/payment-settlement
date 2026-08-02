import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
    isDark: boolean;
    toggleTheme: () => void;
    setDark: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isDark, setIsDark] = useState(() => {
        // Cek preferensi dari localStorage atau sistem
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const toggleTheme = () => setIsDark(!isDark);
    const setDark = (value: boolean) => setIsDark(value);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, setDark }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};