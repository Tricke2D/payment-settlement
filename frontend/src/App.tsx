import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import DashboardPage from './pages/DashboardPage';
import SettlementsPage from './pages/SettlementsPage';
import AuditPage from './pages/AuditPage';
import TransactionsPage from './pages/TransactionsPage';
import SellersPage from './pages/SellersPage';

const Navbar: React.FC = () => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <nav className="bg-white dark:bg-dark-card shadow-md px-6 py-4 sticky top-0 z-50 transition-colors">
            <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    💰 Payment Settlement Engine
                </h1>
                <div className="flex items-center gap-4 flex-wrap">
                    <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition text-sm">
                        Dashboard
                    </Link>
                    <Link to="/settlements" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition text-sm">
                        Settlements
                    </Link>
                    <Link to="/audit" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition text-sm">
                        Audit
                    </Link>
                    <Link to="/transactions" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition text-sm">
                        Transactions
                    </Link>
                    <Link to="/sellers" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition text-sm">
                        Sellers
                    </Link>
                    {/* Dark Mode Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                        aria-label="Toggle theme"
                    >
                        {isDark ? (
                            <span className="text-yellow-400 text-xl">☀️</span>
                        ) : (
                            <span className="text-gray-600 text-xl">🌙</span>
                        )}
                    </button>
                </div>
            </div>
        </nav>
    );
};

function AppContent() {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-dark-bg transition-colors">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 py-6">
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/settlements" element={<SettlementsPage />} />
                    <Route path="/audit" element={<AuditPage />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/sellers" element={<SellersPage />} />
                </Routes>
            </main>
            <ToastContainer position="bottom-right" theme={useTheme().isDark ? 'dark' : 'light'} />
        </div>
    );
}

function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;