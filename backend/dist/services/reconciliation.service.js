"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconciliationEngine = void 0;
exports.startReconciliationScheduler = startReconciliationScheduler;
// src/services/reconciliation.service.ts
const database_service_1 = require("./database.service");
const event_publisher_service_1 = require("./event-publisher.service");
const metrics_service_1 = require("./metrics.service");
const node_cron_1 = __importDefault(require("node-cron"));
class ReconciliationEngine {
    /**
     * Main reconciliation job (run daily)
     */
    async runDailyReconciliation() {
        const startTime = Date.now();
        const reconciliationDate = new Date();
        reconciliationDate.setHours(0, 0, 0, 0);
        console.log(`🔄 Starting daily reconciliation for ${reconciliationDate.toDateString()}`);
        try {
            // 1. Get all completed settlements from yesterday
            const startOfYesterday = new Date(reconciliationDate);
            startOfYesterday.setDate(startOfYesterday.getDate() - 1);
            startOfYesterday.setHours(0, 0, 0, 0);
            const endOfYesterday = new Date(reconciliationDate);
            endOfYesterday.setHours(0, 0, 0, 0);
            const settlementsResult = await (0, database_service_1.query)(`SELECT 
                    s.id,
                    s.settlement_id,
                    s.seller_id,
                    s.total_amount,
                    s.status,
                    s.actual_payout_date
                FROM settlements s
                WHERE s.status = $1
                AND s.actual_payout_date >= $2
                AND s.actual_payout_date < $3
                ORDER BY s.seller_id`, ['completed', startOfYesterday, endOfYesterday]);
            const settlements = settlementsResult.rows;
            console.log(`📊 Found ${settlements.length} completed settlements to reconcile`);
            // 2. Fetch bank records (mock for now)
            const bankRecords = await this.fetchBankRecords(startOfYesterday, endOfYesterday);
            console.log(`🏦 Received ${bankRecords.length} bank records`);
            // 3. Compare and identify discrepancies
            const details = [];
            let matchedCount = 0;
            let discrepancyCount = 0;
            let pendingCount = 0;
            let totalDiscrepancyAmount = 0;
            for (const settlement of settlements) {
                const bankRecord = bankRecords.find((r) => r.settlement_id === settlement.settlement_id);
                let detail;
                if (!bankRecord) {
                    detail = {
                        seller_id: settlement.seller_id,
                        settlement_id: settlement.settlement_id,
                        expected_amount: parseFloat(settlement.total_amount),
                        actual_amount: null,
                        discrepancy_amount: parseFloat(settlement.total_amount),
                        reason: 'Settlement not found in bank records',
                        status: 'pending',
                    };
                    pendingCount++;
                    totalDiscrepancyAmount += parseFloat(settlement.total_amount);
                }
                else if (bankRecord.amount === parseFloat(settlement.total_amount)) {
                    detail = {
                        seller_id: settlement.seller_id,
                        settlement_id: settlement.settlement_id,
                        expected_amount: parseFloat(settlement.total_amount),
                        actual_amount: bankRecord.amount,
                        discrepancy_amount: 0,
                        reason: 'Matched',
                        status: 'matched',
                    };
                    matchedCount++;
                }
                else {
                    const discrepancy = bankRecord.amount - parseFloat(settlement.total_amount);
                    detail = {
                        seller_id: settlement.seller_id,
                        settlement_id: settlement.settlement_id,
                        expected_amount: parseFloat(settlement.total_amount),
                        actual_amount: bankRecord.amount,
                        discrepancy_amount: discrepancy,
                        reason: `Amount mismatch: expected ${settlement.total_amount}, got ${bankRecord.amount}`,
                        status: 'discrepancy_found',
                    };
                    discrepancyCount++;
                    totalDiscrepancyAmount += Math.abs(discrepancy);
                    (0, metrics_service_1.recordReconciliationDiscrepancy)(settlement.seller_id, Math.abs(discrepancy), discrepancy > 0 ? 'overpaid' : 'underpaid');
                }
                details.push(detail);
                // Store reconciliation record
                await (0, database_service_1.query)(`INSERT INTO reconciliation_records 
                     (reconciliation_date, settlement_id, seller_id, expected_amount, actual_amount, discrepancy_amount, status, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, [
                    reconciliationDate,
                    settlement.settlement_id,
                    settlement.seller_id,
                    detail.expected_amount,
                    detail.actual_amount,
                    detail.discrepancy_amount,
                    detail.status,
                ]);
            }
            const durationSeconds = (Date.now() - startTime) / 1000;
            (0, metrics_service_1.recordReconciliationExecuted)('success', durationSeconds);
            const result = {
                reconciliation_date: reconciliationDate,
                total_settlements_checked: settlements.length,
                matched: matchedCount,
                discrepancies: discrepancyCount,
                pending: pendingCount,
                total_discrepancy_amount: totalDiscrepancyAmount,
                details,
            };
            console.log(`✅ Reconciliation complete:`);
            console.log(`   Matched: ${matchedCount}`);
            console.log(`   Discrepancies: ${discrepancyCount}`);
            console.log(`   Pending: ${pendingCount}`);
            // Alert if discrepancies found
            if (discrepancyCount > 0 || pendingCount > 0) {
                await this.publishReconciliationAlert(result);
            }
            return result;
        }
        catch (error) {
            console.error('❌ Reconciliation failed:', error);
            (0, metrics_service_1.recordReconciliationExecuted)('failure', (Date.now() - startTime) / 1000);
            throw error;
        }
    }
    /**
     * Mock bank API call - replace with real bank integration
     */
    async fetchBankRecords(startDate, endDate) {
        console.log(`📡 [STUB] Fetching bank records from ${startDate.toDateString()} to ${endDate.toDateString()}`);
        // Mock data - in production, call real bank API
        return [
            {
                seller_id: 1,
                settlement_id: 'SETTLE-1785485670057-ea5c3fb0', // From your test
                bank_date: new Date(),
                amount: 450000,
                bank_reference: 'BANK-2024-001',
                status: 'matched',
            },
        ];
    }
    /**
     * Publish alert for reconciliation discrepancies
     */
    async publishReconciliationAlert(result) {
        try {
            await event_publisher_service_1.eventPublisher.publishSettlementEvent({
                event_id: `ALERT-${Date.now()}`,
                timestamp: new Date(),
                event_type: 'reconciliation.discrepancy_found',
                settlement_id: 'RECONCILIATION',
                seller_id: 0,
                amount: result.total_discrepancy_amount,
                status: 'alert',
                audit_action: 'reconciliation_discrepancy_found',
                metadata: {
                    discrepancies: result.discrepancies,
                    pending: result.pending,
                    total_amount: result.total_discrepancy_amount,
                },
            });
            console.log(`🔔 Reconciliation alert published`);
        }
        catch (error) {
            console.error('❌ Failed to publish reconciliation alert:', error);
        }
    }
}
exports.reconciliationEngine = new ReconciliationEngine();
/**
 * Start daily reconciliation scheduler (runs at 2 AM every day)
 */
function startReconciliationScheduler() {
    // Schedule at 2 AM every day
    node_cron_1.default.schedule('0 2 * * *', async () => {
        console.log('⏰ Running scheduled reconciliation...');
        try {
            await exports.reconciliationEngine.runDailyReconciliation();
        }
        catch (error) {
            console.error('❌ Scheduled reconciliation failed:', error);
        }
    });
    console.log('📅 Reconciliation scheduler started (runs at 2 AM daily)');
}
