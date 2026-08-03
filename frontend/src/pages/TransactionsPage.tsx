import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { settlementAPI } from '../api/clients';
import FilterBar from '../components/filters/FilterBar';
import { SkeletonTable } from '../components/common/Skeleton';
import { formatRupiah, formatDate, getStatusColor } from '../utils/formatter';
import { showToast } from '../components/common/Toast';

const TransactionsPage: React.FC = () => {
    const [allData, setAllData] = useState<any[]>([]);  // Data asli
    const [displayData, setDisplayData] = useState<any[]>([]); // Data yang ditampilkan
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: 'all', search: '', dateFrom: '', dateTo: '' });
    const [sellers, setSellers] = useState<any[]>([]);
    const [showSellerModal, setShowSellerModal] = useState(false);

    useEffect(() => {
        fetchData();
        fetchSellers();
    }, []);

    // Filter data saat filter berubah
    useEffect(() => {
        applyFilters();
    }, [filters, allData]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await settlementAPI.getDashboard();
            const data = response.data.data?.recent || [];
            setAllData(data);
            setDisplayData(data);
        } catch (err) {
            showToast.error('Gagal mengambil data transaksi');
        } finally {
            setLoading(false);
        }
    };

    const fetchSellers = async () => {
        try {
            const response = await settlementAPI.getSellers();
            setSellers(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch sellers');
        }
    };

    const applyFilters = () => {
        let filtered = [...allData];

        if (filters.status !== 'all') {
            filtered = filtered.filter((item) => item.status === filters.status);
        }

        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter((item) =>
                item.settlement_id?.toLowerCase().includes(search) ||
                String(item.seller_id).includes(search)
            );
        }

        setDisplayData(filtered);
    };

    const handleFilterChange = (newFilters: any) => {
        setFilters(newFilters);
    };

    const handleReset = () => {
        setFilters({ status: 'all', search: '', dateFrom: '', dateTo: '' });
        setDisplayData(allData);
    };

    if (loading) return <Layout><SkeletonTable /></Layout>;

    return (
        <Layout>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">📋 Transactions</h2>
                    <button
                        onClick={() => setShowSellerModal(!showSellerModal)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        📋 Lihat Seller
                    </button>
                </div>

                <FilterBar
                    onFilter={handleFilterChange}
                    onReset={handleReset}
                    onExport={() => showToast.info('Export Excel coming soon!')}
                    onExportCSV={() => showToast.info('Export CSV coming soon!')}
                />

                {/* Seller Modal */}
                {showSellerModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">📋 Daftar Seller</h3>
                                <button
                                    onClick={() => setShowSellerModal(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl"
                                >
                                    ×
                                </button>
                            </div>
                            {sellers.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">Belum ada seller terdaftar</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                        {sellers.map((seller: any) => (
                                            <tr key={seller.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-sm">{seller.id}</td>
                                                <td className="px-4 py-2 text-sm font-mono">{seller.seller_code}</td>
                                                <td className="px-4 py-2 text-sm">{seller.name}</td>
                                                <td className="px-4 py-2 text-sm">{formatRupiah(parseFloat(seller.total_balance))}</td>
                                                <td className="px-4 py-2">
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full
                                                            ${seller.status === 'active' ? 'bg-green-100 text-green-800' :
                                                            seller.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'}`}>
                                                            {seller.status}
                                                        </span>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-dark-card rounded-xl shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {displayData.length > 0 ? (
                                displayData.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-sm font-mono text-gray-800 dark:text-gray-200">{item.settlement_id}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">#{item.seller_id}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">{formatRupiah(parseFloat(item.total_amount))}</td>
                                        <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                                                    {item.status}
                                                </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{formatDate(item.created_at)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        Tidak ada transaksi ditemukan
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default TransactionsPage;