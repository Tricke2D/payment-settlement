import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import DashboardPage from './pages/DashboardPage';
import AuditPage from './pages/AuditPage';
import TransactionsPage from './pages/TransactionsPage';
import EmailPage from './pages/EmailPage';
import SellersPage from './pages/SellersPage';

const Navbar: React.FC = () => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <nav className="bg-white shadow-md px-6 py-4 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-xl font-bold text-blue-600">💰 Payment Settlement Engine</h1>
                <div className="flex gap-4 flex-wrap">
                    <Link to="/" className="text-gray-600 hover:text-blue-600 transition text-sm">Dashboard</Link>
                    <Link to="/transactions" className="text-gray-600 hover:text-blue-600 transition text-sm">Transactions</Link>
                    <Link to="/audit" className="text-gray-600 hover:text-blue-600 transition text-sm">Audit</Link>
                    <Link to="/email" className="text-gray-600 hover:text-blue-600 transition text-sm">Email</Link>
                    <Link to="/sellers" className="text-gray-600 hover:text-blue-600 transition text-sm">Sellers</Link>
                </div>
                <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 transition">
                    {isDark ? '☀️' : '🌙'}
                </button>
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
                    <Route path="/audit" element={<AuditPage />} />
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/email" element={<EmailPage />} />
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