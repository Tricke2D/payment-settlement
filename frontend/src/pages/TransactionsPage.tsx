import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { settlementAPI } from '../api/clients';
import FilterBar from '../components/filters/FilterBar';
import { SkeletonTable } from '../components/common/Skeleton';
import { formatRupiah, formatDate, getStatusColor } from '../utils/formatter';
import { showToast } from '../components/common/Toast';

const TransactionsPage: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: 'all', search: '', dateFrom: '', dateTo: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await settlementAPI.getDashboard();
            setData(response.data.data?.recent || []);
        } catch (err) {
            showToast.error('Gagal mengambil data transaksi');
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = (newFilters: any) => {
        setFilters(newFilters);
        // Filter data locally
        const filtered = data.filter((item: any) => {
            const matchStatus = newFilters.status === 'all' || item.status === newFilters.status;
            const matchSearch = item.settlement_id?.includes(newFilters.search) ||
                String(item.seller_id).includes(newFilters.search);
            return matchStatus && matchSearch;
        });
        setData(filtered);
    };

    if (loading) return <Layout><SkeletonTable /></Layout>;

    return (
        <Layout>
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">📋 Transactions</h2>
                <FilterBar onFilter={handleFilter} />
                <div className="bg-white dark:bg-dark-card rounded-xl shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Seller</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {data.map((item: any) => (
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
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default TransactionsPage;