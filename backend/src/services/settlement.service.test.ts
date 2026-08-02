// src/services/settlement.service.test.ts
import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { query } from './database.service';
import { initiateSettlement, phase1LockFunds, phase2Commit } from './settlement.service';

describe('Settlement Service', () => {

    test('should initiate settlement', async () => {
        const result = await initiateSettlement({
            seller_id: 1,
            settlement_period_start: '2024-01-01',
            settlement_period_end: '2024-01-31',
            idempotency_key: `test-${Date.now()}`
        });

        expect(result.success).toBe(true);
        expect(result.settlement_id).toBeDefined();
        expect(result.settlement_id).toContain('SETTLE-');
    });

    test('should lock funds (phase 1)', async () => {
        // Create settlement dulu
        const initiateResult = await initiateSettlement({
            seller_id: 1,
            settlement_period_start: '2024-01-01',
            settlement_period_end: '2024-01-31',
            idempotency_key: `test-lock-${Date.now()}`
        });

        expect(initiateResult.success).toBe(true);
        expect(initiateResult.settlement_id).toBeDefined();

        // Ambil ID dari database
        const settlementResult = await query(
            `SELECT id FROM settlements WHERE settlement_id = $1`,
            [initiateResult.settlement_id]
        );

        const settlementId = settlementResult.rows[0]?.id;

        if (!settlementId) {
            throw new Error('Settlement not found');
        }

        const lockResult = await phase1LockFunds({
            settlement_id: settlementId
        });

        expect(lockResult.success).toBe(true);
        expect(lockResult.locked_amount).toBeGreaterThan(0);
    });

    test('should commit settlement (phase 2)', async () => {
        // Create settlement
        const initiateResult = await initiateSettlement({
            seller_id: 1,
            settlement_period_start: '2024-01-01',
            settlement_period_end: '2024-01-31',
            idempotency_key: `test-commit-${Date.now()}`
        });

        expect(initiateResult.success).toBe(true);

        // Ambil ID
        const settlementResult = await query(
            `SELECT id FROM settlements WHERE settlement_id = $1`,
            [initiateResult.settlement_id]
        );

        const settlementId = settlementResult.rows[0]?.id;

        if (!settlementId) {
            throw new Error('Settlement not found');
        }

        // Lock
        await phase1LockFunds({ settlement_id: settlementId });

        // Commit
        const commitResult = await phase2Commit(settlementId);

        expect(commitResult.success).toBe(true);
        expect(commitResult.completed_at).toBeDefined();
    });

    test('should handle idempotent request', async () => {
        const idempotencyKey = `idempotent-${Date.now()}`;

        const result1 = await initiateSettlement({
            seller_id: 1,
            settlement_period_start: '2024-01-01',
            settlement_period_end: '2024-01-31',
            idempotency_key: idempotencyKey
        });

        const result2 = await initiateSettlement({
            seller_id: 1,
            settlement_period_start: '2024-01-01',
            settlement_period_end: '2024-01-31',
            idempotency_key: idempotencyKey
        });

        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
        expect(result1.settlement_id).toBe(result2.settlement_id);
    });
});