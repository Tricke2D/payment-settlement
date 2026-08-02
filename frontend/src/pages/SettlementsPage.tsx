import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { settlementAPI } from '../api/clients';

interface Settlement {
    id: number;
    settlement_id: string;
    seller_id: number;
    total_amount: string;
    status: string;
    created_at: string;
}

const SettlementsPage: React.FC = () => {
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSettlements();
    }, []);

    const fetchSettlements = async () => {
        try {
            setLoading(true);
            const response = await settlementAPI.getDashboard();
            const data = response.data.data;
            setSettlements(data.recent || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch settlements');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Layout><div className="text-center py-10">Loading...</div></Layout>;
    if (error) return <Layout><div className="text-center py-10 text-red-500">Error: {error}</div></Layout>;

    return (
        <Layout>
            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">📋 All Settlements</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Settlement ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                        {settlements.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.settlement_id}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">Seller #{item.seller_id}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">Rp {parseFloat(item.total_amount).toLocaleString('id-ID')}</td>
                                <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full
                                            ${item.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                item.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {item.status}
                                        </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default SettlementsPage;