// src/routes/admin.ts
import { Router, Request, Response } from 'express';
import { reconciliationEngine } from '../services/reconciliation.service';
import { query, getConnection } from '../services/database.service';

const router = Router();

/**
 * GET /api/admin/reconciliation - Get reconciliation records
 */
router.get('/reconciliation', async (req: Request, res: Response) => {
    try {
        const { seller_id, limit = 30 } = req.query;

        let whereClause = '1=1';
        const params: any[] = [];

        if (seller_id) {
            whereClause += ` AND seller_id = $1`;
            params.push(seller_id);
        }

        const result = await query(
            `SELECT * FROM reconciliation_records
             WHERE ${whereClause}
             ORDER BY reconciliation_date DESC
                 LIMIT $${params.length + 1}`,
            [...params, limit]
        );

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
        });
    } catch (error) {
        console.error('❌ Error fetching reconciliation:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * POST /api/admin/reconciliation/run-manual - Manual reconciliation
 */
router.post('/reconciliation/run-manual', async (req: Request, res: Response) => {
    try {
        console.log('🚀 Manual reconciliation triggered');
        const result = await reconciliationEngine.runDailyReconciliation();

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('❌ Reconciliation failed:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * POST /api/admin/sellers - Tambah seller baru
 */
router.post('/sellers', async (req: Request, res: Response) => {
    try {
        const { seller_code, name, email, total_balance } = req.body;

        // Validasi input
        if (!seller_code || !name || !email) {
            return res.status(400).json({
                success: false,
                error: 'seller_code, name, and email required'
            });
        }

        // Cek apakah seller_code sudah ada
        const checkResult = await query(
            `SELECT id FROM sellers WHERE seller_code = $1`,
            [seller_code]
        );

        if (checkResult.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Seller code ${seller_code} already exists`
            });
        }

        // Insert seller
        const result = await query(
            `INSERT INTO sellers (seller_code, name, email, total_balance, status)
             VALUES ($1, $2, $3, $4, 'active')
                 RETURNING id, seller_code, name, email, total_balance, status`,
            [seller_code, name, email, total_balance || 0]
        );

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error: any) {
        console.error('❌ Error adding seller:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to add seller'
        });
    }
});

/**
 * GET /api/admin/sellers - Get all sellers
 */
router.get('/sellers', async (req: Request, res: Response) => {
    try {
        const { limit = 100, offset = 0 } = req.query;

        const result = await query(
            `SELECT id, seller_code, name, email, total_balance, status, created_at
             FROM sellers
             ORDER BY id
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
        });
    } catch (error) {
        console.error('❌ Error fetching sellers:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * GET /api/admin/dashboard - Dashboard stats
 */
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        const statsResult = await query(
            `SELECT
                 status,
                 COUNT(*) as count,
                SUM(total_amount) as total_amount
             FROM settlements
             GROUP BY status`
        );

        const stats: Record<string, any> = {};
        statsResult.rows.forEach((row) => {
            stats[row.status] = {
                count: parseInt(row.count),
                amount: parseFloat(row.total_amount || 0),
            };
        });

        const recentResult = await query(
            `SELECT id, settlement_id, seller_id, total_amount, status, created_at
             FROM settlements
             ORDER BY created_at DESC
                 LIMIT 10`
        );

        res.json({
            success: true,
            data: {
                by_status: stats,
                recent: recentResult.rows,
            },
        });
    } catch (error) {
        console.error('❌ Error fetching dashboard:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * POST /api/admin/disputes - Create dispute
 */
router.post('/disputes', async (req: Request, res: Response) => {
    try {
        const { settlement_id, reason, description } = req.body;

        if (!settlement_id || !reason) {
            return res.status(400).json({
                success: false,
                error: 'settlement_id and reason required',
            });
        }

        const client = await getConnection();

        try {
            await client.query('BEGIN');

            const settlementResult = await client.query(
                `SELECT id, seller_id, status FROM settlements WHERE settlement_id = $1`,
                [settlement_id]
            );

            if (settlementResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    error: 'Settlement not found',
                });
            }

            const settlement = settlementResult.rows[0];

            await client.query(
                `UPDATE settlements SET status = 'disputed' WHERE id = $1`,
                [settlement.id]
            );

            const disputeId = `DISPUTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await client.query(
                `INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [
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
                ]
            );

            await client.query('COMMIT');

            res.json({
                success: true,
                dispute_id: disputeId,
                message: 'Dispute created',
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error creating dispute:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * POST /api/admin/disputes/:dispute_id/resolve - Resolve dispute
 */
router.post('/disputes/:dispute_id/resolve', async (req: Request, res: Response) => {
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
        await query(
            `INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [
                'disputes',
                0,
                'dispute.resolved',
                JSON.stringify({
                    dispute_id,
                    resolution,
                    refund_amount: refund_amount || 0,
                    resolved_at: new Date().toISOString(),
                }),
            ]
        );

        res.json({
            success: true,
            message: `Dispute resolved: ${resolution}`,
        });
    } catch (error) {
        console.error('❌ Error resolving dispute:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

export default router;