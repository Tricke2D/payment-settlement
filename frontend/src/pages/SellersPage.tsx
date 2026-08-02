import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import { settlementAPI } from '../api/clients';
import { showToast } from '../components/common/Toast';

const SellersPage: React.FC = () => {
    const [form, setForm] = useState({
        seller_code: '',
        name: '',
        email: '',
        total_balance: 0,
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await settlementAPI.addSeller(form);
            showToast.success('✅ Seller berhasil ditambahkan!');
            setForm({ seller_code: '', name: '', email: '', total_balance: 0 });
        } catch (err: any) {
            showToast.error('❌ Gagal menambahkan seller');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-md p-6 transition-colors">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">➕ Tambah Seller</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Tambahkan seller baru untuk settlement</p>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seller Code</label>
                        <input
                            type="text"
                            placeholder="SEL004"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.seller_code}
                            onChange={(e) => setForm({ ...form, seller_code: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input
                            type="text"
                            placeholder="Nama Seller"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            placeholder="seller@example.com"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Balance</label>
                        <input
                            type="number"
                            placeholder="0"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.total_balance}
                            onChange={(e) => setForm({ ...form, total_balance: Number(e.target.value) })}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="md:col-span-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : '💾 Save Seller'}
                    </button>
                </form>
            </div>
        </Layout>
    );
};

export default SellersPage;