import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { settlementAPI } from '../api/clients';
import { showToast } from '../components/common/Toast';

const EmailPage: React.FC = () => {
    const [transactionId, setTransactionId] = useState('');
    const [settlementData, setSettlementData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    const fetchSettlement = async () => {
        if (!transactionId.trim()) {
            showToast.warning('Masukkan Transaction ID');
            return;
        }

        setLoading(true);
        try {
            const response = await settlementAPI.getOne(transactionId);
            setSettlementData(response.data.data);
        } catch (err) {
            showToast.error('Transaction not found');
            setSettlementData(null);
        } finally {
            setLoading(false);
        }
    };

    const sendEmail = async () => {
        if (!settlementData) return;
        setSending(true);
        try {
            await settlementAPI.sendEmail({
                settlement_id: settlementData.settlement_id,
                email: settlementData.seller_email || 'seller@example.com',
                amount: settlementData.total_amount,
                status: settlementData.status
            });
            showToast.success('✅ Email sent successfully!');
        } catch (err) {
            showToast.error('❌ Failed to send email');
        } finally {
            setSending(false);
        }
    };

    return (
        <Layout>
            <div className="bg-white dark:bg-dark-card rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">✉️ Kirim Email Notifikasi</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Masukkan Transaction ID untuk mengirim email ke seller</p>

                <div className="flex gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Contoh: SETTLE-001"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                    />
                    <button
                        onClick={fetchSettlement}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : '🔍 Cari'}
                    </button>
                </div>

                {settlementData && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-2 gap-2">
                            <p><span className="font-semibold">ID:</span> {settlementData.settlement_id}</p>
                            <p><span className="font-semibold">Seller:</span> #{settlementData.seller_id}</p>
                            <p><span className="font-semibold">Amount:</span> Rp {parseFloat(settlementData.total_amount).toLocaleString('id-ID')}</p>
                            <p><span className="font-semibold">Status:</span> {settlementData.status}</p>
                            <p><span className="font-semibold">Email:</span> {settlementData.seller_email || 'N/A'}</p>
                        </div>
                    </div>
                )}

                {settlementData && (
                    <button
                        onClick={sendEmail}
                        disabled={sending}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                        {sending ? 'Sending...' : '📧 Send Email'}
                    </button>
                )}
            </div>
        </Layout>
    );
};

export default EmailPage;