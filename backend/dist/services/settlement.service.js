"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateSettlement = initiateSettlement;
exports.phase1LockFunds = phase1LockFunds;
exports.phase2Commit = phase2Commit;
exports.phase2Rollback = phase2Rollback;
// src/services/settlement.service.ts
const event_publisher_service_1 = require("./event-publisher.service");
const midtransClient = require('midtrans-client');
const database_service_1 = require("./database.service");
const metrics_service_1 = require("./metrics.service");
const types_1 = require("../types");
const audit_service_1 = require("./audit.service");
const crypto_1 = __importDefault(require("crypto"));
// ====== PHASE 1: LOCK & VALIDATE ======
async function initiateSettlement(req) {
    const client = await (0, database_service_1.getConnection)();
    try {
        await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
        // 1. Check if already processed (idempotency)
        const existingSettlement = await client.query(`SELECT id, settlement_id FROM settlements WHERE idempotency_key = $1`, [req.idempotency_key]);
        if (existingSettlement.rows.length > 0) {
            await client.query('COMMIT');
            return {
                success: true,
                settlement_id: existingSettlement.rows[0].settlement_id,
            };
        }
        // 2. Validate seller exists and is active
        const sellerResult = await client.query(`SELECT id, total_balance, status FROM sellers WHERE id = $1`, [req.seller_id]);
        if (sellerResult.rows.length === 0) {
            throw new Error(`Seller ${req.seller_id} not found`);
        }
        const seller = sellerResult.rows[0];
        if (seller.status !== 'active') {
            throw new Error(`Seller status is ${seller.status}, not active`);
        }
        // 3. Fetch all pending transactions in period
        const transactionsResult = await client.query(`SELECT id, amount, status FROM transactions
             WHERE seller_id = $1
               AND created_at::DATE BETWEEN $2 AND $3
               AND status = $4`, [req.seller_id, req.settlement_period_start, req.settlement_period_end, 'completed']);
        const transactions = transactionsResult.rows;
        if (transactions.length === 0) {
            throw new Error('No completed transactions in period');
        }
        const totalAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        // 4. Create settlement record (status = PENDING first)
        const settlementId = `SETTLE-${Date.now()}-${crypto_1.default.randomBytes(4).toString('hex')}`;
        const settlementResult = await client.query(`INSERT INTO settlements (
                settlement_id, seller_id, total_amount, status,
                settlement_period_start, settlement_period_end, idempotency_key
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id, settlement_id`, [
            settlementId,
            req.seller_id,
            totalAmount,
            types_1.SettlementStatus.PENDING,
            req.settlement_period_start,
            req.settlement_period_end,
            req.idempotency_key,
        ]);
        const settlement = settlementResult.rows[0];
        // 5. Create settlement items (breakdown)
        for (const transaction of transactions) {
            await client.query(`INSERT INTO settlement_items (settlement_id, transaction_id, amount, net_amount, status)
                 VALUES ($1, $2, $3, $4, $5)`, [settlement.id, transaction.id, transaction.amount, transaction.amount, 'pending']);
        }
        // 6. Log initiation
        await (0, audit_service_1.auditLog)(client, 'settlements', settlement.id, types_1.AuditAction.SETTLEMENT_INITIATED, null, { settlement_id: settlementId, seller_id: req.seller_id, total_amount: totalAmount }, null);
        await client.query('COMMIT');
        // 7. Publish event ke Kafka (after commit to ensure DB consistency)
        try {
            const event = {
                event_id: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                event_type: 'settlement.initiated',
                settlement_id: settlementId,
                seller_id: req.seller_id,
                amount: totalAmount,
                status: types_1.SettlementStatus.PENDING,
                audit_action: types_1.AuditAction.SETTLEMENT_INITIATED,
            };
            await event_publisher_service_1.eventPublisher.publishSettlementEvent(event);
        }
        catch (error) {
            console.error('⚠️  Failed to publish settlement event:', error);
        }
        return {
            success: true,
            settlement_id: settlementId,
        };
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Settlement initiation failed:', error);
        return {
            success: false,
            error: error.message,
        };
    }
    finally {
        client.release();
    }
}
// ====== PHASE 1: LOCK FUNDS ======
async function phase1LockFunds(req) {
    const client = await (0, database_service_1.getConnection)();
    try {
        await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
        // 1. Fetch settlement
        const settlementResult = await client.query(`SELECT id, settlement_id, seller_id, total_amount, status FROM settlements WHERE id = $1 FOR UPDATE`, [req.settlement_id]);
        if (settlementResult.rows.length === 0) {
            throw new Error(`Settlement ${req.settlement_id} not found`);
        }
        const settlement = settlementResult.rows[0];
        if (settlement.status !== types_1.SettlementStatus.PENDING) {
            throw new Error(`Settlement status is ${settlement.status}, expected ${types_1.SettlementStatus.PENDING}`);
        }
        // 2. Fetch seller for update (lock)
        const sellerResult = await client.query(`SELECT id, total_balance FROM sellers WHERE id = $1 FOR UPDATE`, [settlement.seller_id]);
        const seller = sellerResult.rows[0];
        // 3. Validate sufficient balance
        const availableBalance = parseFloat(seller.total_balance);
        const requiredAmount = parseFloat(settlement.total_amount);
        if (availableBalance < requiredAmount) {
            throw new Error(`Insufficient balance. Available: ${availableBalance}, Required: ${requiredAmount}`);
        }
        // 4. Lock the amount (deduct from available balance)
        await client.query(`UPDATE sellers SET total_balance = total_balance - $1 WHERE id = $2`, [settlement.total_amount, settlement.seller_id]);
        // 5. Update settlement status to PHASE_1_LOCKED
        await client.query(`UPDATE settlements
             SET status = $1, phase_1_lock_timestamp = NOW()
             WHERE id = $2`, [types_1.SettlementStatus.PHASE_1_LOCKED, req.settlement_id]);
        // 6. Lock all settlement items (mark as locked)
        await client.query(`UPDATE settlement_items SET status = 'locked' WHERE settlement_id = $1`, [req.settlement_id]);
        // 7. Audit log
        await (0, audit_service_1.auditLog)(client, 'settlements', req.settlement_id, types_1.AuditAction.PHASE_1_LOCK_ACQUIRED, { status: types_1.SettlementStatus.PENDING }, { status: types_1.SettlementStatus.PHASE_1_LOCKED }, null);
        // Publish event
        try {
            const event = {
                event_id: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                event_type: 'settlement.phase1_locked',
                settlement_id: settlement.settlement_id,
                seller_id: settlement.seller_id,
                amount: parseFloat(settlement.total_amount),
                status: types_1.SettlementStatus.PHASE_1_LOCKED,
                previous_status: types_1.SettlementStatus.PENDING,
                audit_action: types_1.AuditAction.PHASE_1_LOCK_ACQUIRED,
            };
            await event_publisher_service_1.eventPublisher.publishSettlementEvent(event);
        }
        catch (error) {
            console.error('⚠️  Failed to publish phase1 event:', error);
        }
        await client.query('COMMIT');
        return {
            success: true,
            locked_amount: parseFloat(settlement.total_amount),
        };
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Phase 1 lock failed:', error);
        // Record failure metrics
        try {
            const settlementResult = await (0, database_service_1.query)(`SELECT seller_id FROM settlements WHERE id = $1`, [req.settlement_id]);
            if (settlementResult.rows.length > 0) {
                (0, metrics_service_1.recordSettlementFailure)(settlementResult.rows[0].seller_id, error.message);
            }
        }
        catch (metricError) {
            console.error('Failed to record metric:', metricError);
        }
        // Log failure
        try {
            const settlementResult = await (0, database_service_1.query)(`SELECT id FROM settlements WHERE id = $1`, [req.settlement_id]);
            if (settlementResult.rows.length > 0) {
                await (0, audit_service_1.auditLog)(await (0, database_service_1.getConnection)(), 'settlements', req.settlement_id, types_1.AuditAction.PHASE_1_LOCK_FAILED, { status: types_1.SettlementStatus.PENDING }, { status: types_1.SettlementStatus.FAILED, error: error.message }, null);
            }
        }
        catch (auditError) {
            console.error('❌ Failed to log Phase 1 failure:', auditError);
        }
        return {
            success: false,
            error: error.message,
        };
    }
    finally {
        client.release();
    }
}
// ====== PHASE 2: COMMIT OR ROLLBACK ======
async function phase2Commit(settlementId) {
    const client = await (0, database_service_1.getConnection)();
    try {
        await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
        // 1. Fetch settlement
        const settlementResult = await client.query(`SELECT id, settlement_id, seller_id, total_amount, status FROM settlements WHERE id = $1 FOR UPDATE`, [settlementId]);
        if (settlementResult.rows.length === 0) {
            throw new Error(`Settlement ${settlementId} not found`);
        }
        const settlement = settlementResult.rows[0];
        if (settlement.status !== types_1.SettlementStatus.PHASE_1_LOCKED) {
            throw new Error(`Settlement must be in ${types_1.SettlementStatus.PHASE_1_LOCKED} status, got ${settlement.status}`);
        }
        // 2. Call payment gateway (Stripe/Midtrans) to transfer funds
        // For now, simulate success
        const paymentSuccess = await processPaymentGateway(settlement);
        if (!paymentSuccess) {
            throw new Error('Payment gateway rejected transfer');
        }
        // 3. Mark all transactions in settlement as processed
        await client.query(`UPDATE transactions SET status = $1 WHERE id IN (
                SELECT transaction_id FROM settlement_items WHERE settlement_id = $2
            )`, [types_1.TransactionStatus.COMPLETED, settlementId]);
        // 4. Update settlement status to COMPLETED
        await client.query(`UPDATE settlements
             SET status = $1, phase_2_commit_timestamp = NOW(), actual_payout_date = NOW()
             WHERE id = $2`, [types_1.SettlementStatus.COMPLETED, settlementId]);
        // 5. Audit log
        await (0, audit_service_1.auditLog)(client, 'settlements', settlementId, types_1.AuditAction.PHASE_2_COMMIT, { status: types_1.SettlementStatus.PHASE_1_LOCKED }, { status: types_1.SettlementStatus.COMPLETED }, null);
        // ===== RECORD METRICS (SEBELUM COMMIT) =====
        const startTime = Date.now();
        console.log('📊 Recording settlement success metrics...');
        (0, metrics_service_1.recordSettlementSuccess)(settlement.seller_id, parseFloat(settlement.total_amount), (Date.now() - startTime) / 1000);
        // ==========================================
        // Publish event
        try {
            const event = {
                event_id: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                event_type: 'settlement.completed',
                settlement_id: settlement.settlement_id,
                seller_id: settlement.seller_id,
                amount: parseFloat(settlement.total_amount),
                status: types_1.SettlementStatus.COMPLETED,
                previous_status: types_1.SettlementStatus.PHASE_1_LOCKED,
                audit_action: types_1.AuditAction.PHASE_2_COMMIT,
            };
            await event_publisher_service_1.eventPublisher.publishSettlementEvent(event);
        }
        catch (error) {
            console.error('⚠️  Failed to publish phase2 event:', error);
        }
        await client.query('COMMIT');
        return {
            success: true,
            completed_at: new Date(),
        };
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Phase 2 commit failed:', error);
        // Rollback phase 1
        try {
            await phase2Rollback(settlementId);
        }
        catch (rollbackError) {
            console.error('❌ Rollback also failed:', rollbackError);
        }
        return {
            success: false,
            error: error.message,
        };
    }
    finally {
        client.release();
    }
}
// ====== ROLLBACK ======
async function phase2Rollback(settlementId) {
    const client = await (0, database_service_1.getConnection)();
    try {
        await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
        // 1. Fetch settlement
        const settlementResult = await client.query(`SELECT id, seller_id, total_amount, status FROM settlements WHERE id = $1 FOR UPDATE`, [settlementId]);
        if (settlementResult.rows.length === 0) {
            throw new Error(`Settlement ${settlementId} not found`);
        }
        const settlement = settlementResult.rows[0];
        // 2. Restore seller balance if funds were locked
        if ([types_1.SettlementStatus.PHASE_1_LOCKED, types_1.SettlementStatus.PROCESSING].includes(settlement.status)) {
            await client.query(`UPDATE sellers SET total_balance = total_balance + $1 WHERE id = $2`, [settlement.total_amount, settlement.seller_id]);
        }
        // 3. Update settlement status to ROLLED_BACK
        await client.query(`UPDATE settlements
             SET status = $1, failure_reason = 'Rolled back due to phase 2 failure'
             WHERE id = $2`, [types_1.SettlementStatus.ROLLED_BACK, settlementId]);
        // 4. Audit log
        await (0, audit_service_1.auditLog)(client, 'settlements', settlementId, types_1.AuditAction.PHASE_2_ROLLBACK, { status: settlement.status }, { status: types_1.SettlementStatus.ROLLED_BACK }, null);
        await client.query('COMMIT');
        return { success: true };
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Rollback failed:', error);
        return {
            success: false,
            error: error.message,
        };
    }
    finally {
        client.release();
    }
}
// Helper: Integrate with Midtrans Payment Gateway
async function processPaymentGateway(settlement) {
    try {
        // 1. Inisialisasi client Midtrans
        const snap = new midtransClient.Snap({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
            serverKey: process.env.MIDTRANS_SERVER_KEY || '',
            clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
        });
        // 2. Siapkan data transaksi
        const parameter = {
            transaction_details: {
                order_id: settlement.settlement_id,
                gross_amount: Math.round(settlement.total_amount),
            },
        };
        // 3. Panggil API Midtrans
        const transaction = await snap.createTransaction(parameter);
        const paymentUrl = transaction.redirect_url;
        console.log(`💰 Midtrans transaction created for order: ${settlement.settlement_id}`);
        console.log(`🔗 Payment URL: ${paymentUrl}`);
        // 4. Kirim email dengan URL pembayaran
        try {
            const sellerEmail = await (0, database_service_1.query)(`SELECT email FROM sellers WHERE id = $1`, [settlement.seller_id]);
            if (sellerEmail.rows.length > 0) {
                const { notificationService } = await Promise.resolve().then(() => __importStar(require('./notification.service')));
                await notificationService.send({
                    notification_id: `PAYMENT-${Date.now()}`,
                    timestamp: new Date(),
                    event_type: 'payment.url',
                    recipient_type: 'seller',
                    recipient_id: settlement.settlement_id,
                    title: '🔗 Link Pembayaran Midtrans',
                    message: `Klik link berikut untuk menyelesaikan pembayaran:\n\n${paymentUrl}`,
                    channel: 'email',
                    priority: 'high',
                    settlement_id: settlement.settlement_id,
                    metadata: {
                        payment_url: paymentUrl,
                        seller_email: sellerEmail.rows[0].email,
                    },
                });
                console.log(`📧 Payment URL sent to seller email`);
            }
        }
        catch (emailError) {
            console.error('❌ Failed to send payment URL email:', emailError);
        }
        return true;
    }
    catch (error) {
        console.error('❌ Midtrans payment error:', error);
        return false;
    }
}
