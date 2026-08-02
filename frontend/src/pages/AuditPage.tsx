import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import { settlementAPI } from '../api/clients';

const AuditPage: React.FC = () => {
    const [settlementId, setSettlementId] = useState('');
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchAudit = async () => {
        if (!settlementId.trim()) {
            setError('Please enter a Settlement ID');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const response = await settlementAPI.getAuditTrail(settlementId);
            setAuditLogs(response.data.data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch audit trail');
            setAuditLogs([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">📜 Audit Trail</h2>
                <p className="text-gray-600 mb-4">Cari riwayat aktivitas settlement berdasarkan Settlement ID</p>

                <div className="flex gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Masukkan Settlement ID (contoh: SETTLE-001)"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={settlementId}
                        onChange={(e) => setSettlementId(e.target.value)}
                    />
                    <button
                        onClick={fetchAudit}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : '🔍 Search'}
                    </button>
                </div>

                {error && <div className="text-red-500 mb-4">{error}</div>}

                {auditLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">New State</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                            {auditLogs.map((log, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">{log.action}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{log.entity_type}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                                        {log.new_state ? JSON.stringify(log.new_state).slice(0, 100) + '...' : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {new Date(log.created_at).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    !loading && !error && (
                        <div className="text-center py-10 text-gray-500">
                            {settlementId ? 'No audit logs found for this settlement' : 'Enter a Settlement ID to see audit history'}
                        </div>
                    )
                )}
            </div>
        </Layout>
    );
};

export default AuditPage;