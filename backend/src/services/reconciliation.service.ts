// src/services/reconciliation.service.ts
import { query, getConnection } from './database.service';
import { eventPublisher } from './event-publisher.service';
import {
    recordReconciliationExecuted,
    recordReconciliationDiscrepancy,
    recordSettlementFailure,
} from './metrics.service';
import cron from 'node-cron';

interface BankReconciliationRecord {
    seller_id: number;
    settlement_id: string;
    bank_date: Date;
    amount: number;
    bank_reference: string;
    status: 'matched' | 'pending' | 'discrepancy';
}

interface ReconciliationResult {
    reconciliation_date: Date;
    total_settlements_checked: number;
    matched: number;
    discrepancies: number;
    pending: number;
    total_discrepancy_amount: number;
    details: ReconciliationDetail[];
}

interface ReconciliationDetail {
    seller_id: number;
    settlement_id: string;
    expected_amount: number;
    actual_amount: number | null;
    discrepancy_amount: number;
    reason: string;
    status: 'matched' | 'discrepancy_found' | 'pending';
}

class ReconciliationEngine {
    /**
     * Main reconciliation job (run daily)
     */
    async runDailyReconciliation(): Promise<ReconciliationResult> {
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

            const settlementsResult = await query(
                `SELECT 
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
                ORDER BY s.seller_id`,
                ['completed', startOfYesterday, endOfYesterday]
            );

            const settlements = settlementsResult.rows;
            console.log(`📊 Found ${settlements.length} completed settlements to reconcile`);

            // 2. Fetch bank records (mock for now)
            const bankRecords = await this.fetchBankRecords(startOfYesterday, endOfYesterday);
            console.log(`🏦 Received ${bankRecords.length} bank records`);

            // 3. Compare and identify discrepancies
            const details: ReconciliationDetail[] = [];
            let matchedCount = 0;
            let discrepancyCount = 0;
            let pendingCount = 0;
            let totalDiscrepancyAmount = 0;

            for (const settlement of settlements) {
                const bankRecord = bankRecords.find(
                    (r) => r.settlement_id === settlement.settlement_id
                );

                let detail: ReconciliationDetail;

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
                } else if (bankRecord.amount === parseFloat(settlement.total_amount)) {
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
                } else {
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

                    recordReconciliationDiscrepancy(
                        settlement.seller_id,
                        Math.abs(discrepancy),
                        discrepancy > 0 ? 'overpaid' : 'underpaid'
                    );
                }

                details.push(detail);

                // Store reconciliation record
                await query(
                    `INSERT INTO reconciliation_records 
                     (reconciliation_date, settlement_id, seller_id, expected_amount, actual_amount, discrepancy_amount, status, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                    [
                        reconciliationDate,
                        settlement.settlement_id,
                        settlement.seller_id,
                        detail.expected_amount,
                        detail.actual_amount,
                        detail.discrepancy_amount,
                        detail.status,
                    ]
                );
            }

            const durationSeconds = (Date.now() - startTime) / 1000;
            recordReconciliationExecuted('success', durationSeconds);

            const result: ReconciliationResult = {
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
        } catch (error) {
            console.error('❌ Reconciliation failed:', error);
            recordReconciliationExecuted('failure', (Date.now() - startTime) / 1000);
            throw error;
        }
    }

    /**
     * Mock bank API call - replace with real bank integration
     */
    private async fetchBankRecords(
        startDate: Date,
        endDate: Date
    ): Promise<BankReconciliationRecord[]> {
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
    private async publishReconciliationAlert(result: ReconciliationResult): Promise<void> {
        try {
            await eventPublisher.publishSettlementEvent({
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
            } as any);

            console.log(`🔔 Reconciliation alert published`);
        } catch (error) {
            console.error('❌ Failed to publish reconciliation alert:', error);
        }
    }
}

export const reconciliationEngine = new ReconciliationEngine();

/**
 * Start daily reconciliation scheduler (runs at 2 AM every day)
 */
export function startReconciliationScheduler(): void {
    // Schedule at 2 AM every day
    cron.schedule('0 2 * * *', async () => {
        console.log('⏰ Running scheduled reconciliation...');
        try {
            await reconciliationEngine.runDailyReconciliation();
        } catch (error) {
            console.error('❌ Scheduled reconciliation failed:', error);
        }
    });

    console.log('📅 Reconciliation scheduler started (runs at 2 AM daily)');
}