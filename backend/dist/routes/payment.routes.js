"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_service_1 = require("../services/database.service");
const event_publisher_service_1 = require("../services/event-publisher.service");
const types_1 = require("../types");
const router = (0, express_1.Router)();
// Endpoint untuk menerima notifikasi dari Midtrans
router.post('/notification', async (req, res) => {
    try {
        const notification = req.body;
        console.log('📥 Received Midtrans notification:', JSON.stringify(notification, null, 2));
        // Ambil order_id dari berbagai kemungkinan struktur (webhook atau account linking)
        const order_id = notification.order_id || notification.transaction_details?.order_id;
        // Jika tidak ada order_id, ini bukan notifikasi transaksi (misal: account linking)
        if (!order_id) {
            console.log('ℹ️ Received non-transaction notification (account linking etc), ignoring.');
            return res.status(200).json({ status: 'OK', message: 'Ignored' });
        }
        const { transaction_status, gross_amount, fraud_status } = notification;
        // 1. Cari settlement berdasarkan order_id
        const settlementResult = await (0, database_service_1.query)(`SELECT id, settlement_id, status FROM settlements WHERE settlement_id = $1`, [order_id]);
        if (settlementResult.rows.length === 0) {
            console.warn(`⚠️ Settlement with ID ${order_id} not found`);
            return res.status(404).json({ message: 'Settlement not found' });
        }
        const settlement = settlementResult.rows[0];
        let newStatus = settlement.status;
        // 2. Update status berdasarkan response Midtrans
        if (transaction_status === 'capture' || transaction_status === 'settlement') {
            if (fraud_status === 'accept') {
                newStatus = 'completed';
                console.log(`✅ Payment for ${order_id} is completed`);
                // Publish event ke Kafka
                await event_publisher_service_1.eventPublisher.publishSettlementEvent({
                    event_id: `WEBHOOK-${Date.now()}`,
                    timestamp: new Date(),
                    event_type: 'payment.settlement',
                    settlement_id: order_id,
                    seller_id: settlement.seller_id,
                    amount: gross_amount,
                    status: 'completed',
                    audit_action: types_1.AuditAction.PAYMENT_RECEIVED,
                    metadata: { notification },
                });
            }
            else {
                newStatus = 'fraud';
                console.warn(`⚠️ Fraud detected for ${order_id}`);
            }
        }
        else if (transaction_status === 'pending') {
            newStatus = 'pending';
            console.log(`⏳ Payment for ${order_id} is pending`);
        }
        else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
            newStatus = 'failed';
            console.log(`❌ Payment for ${order_id} is ${transaction_status}`);
        }
        // 3. Update status settlement di database
        if (newStatus !== settlement.status) {
            await (0, database_service_1.query)(`UPDATE settlements SET status = $1 WHERE id = $2`, [newStatus, settlement.id]);
            console.log(`✅ Settlement ${order_id} status updated to ${newStatus}`);
            // Audit trail
            await (0, database_service_1.query)(`INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`, [
                'settlements',
                settlement.id,
                `webhook.${transaction_status}`,
                JSON.stringify({
                    order_id,
                    transaction_status,
                    fraud_status,
                    new_status: newStatus
                }),
            ]);
        }
        // 4. Kirim response success ke Midtrans
        res.status(200).json({ status: 'OK', message: 'Notification processed' });
    }
    catch (error) {
        console.error('❌ Error processing webhook:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
