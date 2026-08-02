import React, { useState, useEffect } from 'react';
import { settlementAPI } from '../../api/clients';
import StatsCard from './StatsCard';
import SettlementTable from './SettlementTable';

interface DashboardData {
    by_status: {
        pending: { count: number; amount: number };
        completed: { count: number; amount: number };
        failed: { count: number; amount: number };
    };
    recent: any[];
}

const Dashboard: React.FC = () => {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
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

    if (loading) return <div className="text-center py-10 text-gray-500">Loading...</div>;
    if (error) return <div className="text-center py-10 text-red-500">Error: {error}</div>;
    if (!dashboardData) return <div className="text-center py-10 text-gray-500">No data available</div>;

    const stats = dashboardData.by_status || { pending: { count: 0, amount: 0 }, completed: { count: 0, amount: 0 }, failed: { count: 0, amount: 0 } };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">📊 Payment Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatsCard title="Pending" count={stats.pending.count} amount={stats.pending.amount} color="border-yellow-400" />
                <StatsCard title="Completed" count={stats.completed.count} amount={stats.completed.amount} color="border-green-400" />
                <StatsCard title="Failed" count={stats.failed.count} amount={stats.failed.amount} color="border-red-400" />
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">🔄 Recent Settlements</h2>
                <SettlementTable data={dashboardData.recent || []} />
            </div>
        </div>
    );
};

export default Dashboard;