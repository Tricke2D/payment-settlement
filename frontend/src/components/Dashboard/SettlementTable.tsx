import React from 'react';

interface Settlement {
    id: number;
    settlement_id: string;
    seller_id: number;
    total_amount: string;
    status: string;
    created_at: string;
}

interface SettlementTableProps {
    data: Settlement[];
}

const SettlementTable: React.FC<SettlementTableProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="text-center py-4 text-gray-500">No settlements found</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl shadow-md">
                <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.settlement_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            Seller #{item.seller_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            Rp {parseFloat(item.total_amount).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                    ${item.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        item.status === 'failed' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'}`}>
                                    {item.status}
                                </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.created_at).toLocaleDateString('id-ID')}
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default SettlementTable;