"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/admin.ts
const express_1 = require("express");
const database_service_1 = require("../services/database.service");
const router = (0, express_1.Router)();
/**
 * GET /api/admin/reconciliation - Get reconciliation records
 */
router.get('/reconciliation', async (req, res) => {
    try {
        const { seller_id, limit = 30 } = req.query;
        let whereClause = '1=1';
        const params = [];
        if (seller_id) {
            whereClause += ` AND seller_id = $1`;
            params.push(seller_id);
        }
        const result = await (0, database_service_1.query)(`SELECT * FROM reconciliation_records 
             WHERE ${whereClause}
             ORDER BY reconciliation_date DESC 
             LIMIT $${params.length + 1}`, [...params, limit]);
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
        });
    }
    catch (error) {
        console.error('❌ Error fetching reconciliation:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/admin/reconciliation/run-manual - Manual reconciliation
 */
router.post('/sellers', async (req, res) => {
    try {
        const { seller_code, name, email, total_balance } = req.body;
        const result = await (0, database_service_1.query)(`INSERT INTO sellers (seller_code, name, email, total_balance, status)
             VALUES ($1, $2, $3, $4, 'active')
             RETURNING *`, [seller_code, name, email, total_balance]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
/**
 * GET /api/admin/dashboard - Dashboard stats
 */
router.get('/dashboard', async (req, res) => {
    try {
        const statsResult = await (0, database_service_1.query)(`SELECT 
                status,
                COUNT(*) as count,
                SUM(total_amount) as total_amount
             FROM settlements
             GROUP BY status`);
        const stats = {};
        statsResult.rows.forEach((row) => {
            stats[row.status] = {
                count: parseInt(row.count),
                amount: parseFloat(row.total_amount || 0),
            };
        });
        const recentResult = await (0, database_service_1.query)(`SELECT id, settlement_id, seller_id, total_amount, status, created_at
             FROM settlements
             ORDER BY created_at DESC
             LIMIT 10`);
        res.json({
            success: true,
            data: {
                by_status: stats,
                recent: recentResult.rows,
            },
        });
    }
    catch (error) {
        console.error('❌ Error fetching dashboard:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/admin/disputes - Create dispute
 */
router.post('/disputes', async (req, res) => {
    try {
        const { settlement_id, reason, description } = req.body;
        if (!settlement_id || !reason) {
            return res.status(400).json({
                success: false,
                error: 'settlement_id and reason required',
            });
        }
        const client = await (0, database_service_1.getConnection)();
        try {
            await client.query('BEGIN');
            const settlementResult = await client.query(`SELECT id, seller_id, status FROM settlements WHERE settlement_id = $1`, [settlement_id]);
            if (settlementResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    error: 'Settlement not found',
                });
            }
            const settlement = settlementResult.rows[0];
            await client.query(`UPDATE settlements SET status = 'disputed' WHERE id = $1`, [settlement.id]);
            const disputeId = `DISPUTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await client.query(`INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`, [
                'settlements',
                settlement.id,
                'settlement.disputed',
                JSON.stringify({
                    dispute_id: disputeId,
                    settlement_id,
                    reason,
                    description,
                    created_at: new Date().toISOString(),
                }),
            ]);
            await client.query('COMMIT');
            res.json({
                success: true,
                dispute_id: disputeId,
                message: 'Dispute created',
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('❌ Error creating dispute:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
/**
 * POST /api/admin/disputes/:dispute_id/resolve - Resolve dispute
 */
router.post('/disputes/:dispute_id/resolve', async (req, res) => {
    try {
        const { dispute_id } = req.params;
        const { resolution, refund_amount } = req.body;
        if (!resolution) {
            return res.status(400).json({
                success: false,
                error: 'resolution required',
            });
        }
        // Mock resolution - just log it
        await (0, database_service_1.query)(`INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
             VALUES ($1, $2, $3, $4, NOW())`, [
            'disputes',
            0,
            'dispute.resolved',
            JSON.stringify({
                dispute_id,
                resolution,
                refund_amount: refund_amount || 0,
                resolved_at: new Date().toISOString(),
            }),
        ]);
        res.json({
            success: true,
            message: `Dispute resolved: ${resolution}`,
        });
    }
    catch (error) {
        console.error('❌ Error resolving dispute:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
exports.default = router;
