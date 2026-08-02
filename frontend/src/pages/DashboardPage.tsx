import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { settlementAPI } from '../api/clients';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusChart from '../components/charts/StatusChart';
import TrendChart from '../components/charts/TrendChart';
import { formatRupiah, formatDate } from '../utils/formatter';

const DashboardPage: React.FC = () => {
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const response = await settlementAPI.getDashboard();
            setDashboardData(response.data.data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="text-center py-10 text-red-500">Error: {error}</div>;
    if (!dashboardData) return <div className="text-center py-10">No data available</div>;

    const stats = dashboardData.by_status || { pending: { count: 0, amount: 0 }, completed: { count: 0, amount: 0 }, failed: { count: 0, amount: 0 } };
    const totalSettlements = (stats.pending.count || 0) + (stats.completed.count || 0) + (stats.failed.count || 0);
    const totalAmount = (stats.pending.amount || 0) + (stats.completed.amount || 0) + (stats.failed.amount || 0);

    return (
        <Layout>
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-600">
                        <p className="text-sm text-gray-500">Total Settlements</p>
                        <p className="text-2xl font-bold text-gray-800">{totalSettlements}</p>
                        <p className="text-sm text-gray-600">{formatRupiah(totalAmount)}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-yellow-400">
                        <p className="text-sm text-gray-500">Pending</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.pending.count}</p>
                        <p className="text-sm text-gray-600">{formatRupiah(stats.pending.amount)}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-400">
                        <p className="text-sm text-gray-500">Completed</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.completed.count}</p>
                        <p className="text-sm text-gray-600">{formatRupiah(stats.completed.amount)}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-red-400">
                        <p className="text-sm text-gray-500">Failed</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.failed.count}</p>
                        <p className="text-sm text-gray-600">{formatRupiah(stats.failed.amount)}</p>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Status Distribution</h3>
                        <StatusChart data={stats} />
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Settlement Trend</h3>
                        <TrendChart data={dashboardData.recent || []} />
                    </div>
                </div>

                {/* Recent Settlements */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">🔄 Recent Settlements</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {dashboardData.recent?.map((item: any) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm font-mono">{item.settlement_id}</td>
                                    <td className="px-4 py-2 text-sm">#{item.seller_id}</td>
                                    <td className="px-4 py-2 text-sm font-medium">{formatRupiah(parseFloat(item.total_amount))}</td>
                                    <td className="px-4 py-2">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full
                                                ${item.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    item.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'}`}>
                                                {item.status}
                                            </span>
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-500">{formatDate(item.created_at)}</td>
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

export default DashboardPage;