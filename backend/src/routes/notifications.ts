// src/routes/notifications.ts
import { Router, Request, Response } from 'express';
import { query } from '../services/database.service';

const router = Router();

/**
 * GET /api/notifications
 * Get all notifications for a seller
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        // Paksa type dengan 'as string'
        const seller_id = req.query.seller_id as string;
        const limit = parseInt(req.query.limit as string || '50', 10);
        const offset = parseInt(req.query.offset as string || '0', 10);

        if (!seller_id) {
            return res.status(400).json({
                success: false,
                error: 'seller_id is required',
            });
        }

        const result = await query(
            `SELECT * FROM audit_logs
             WHERE entity_type = 'notifications'
               AND new_state->'metadata'->>'seller_id' = $1
             ORDER BY created_at DESC
                 LIMIT $2 OFFSET $3`,
            [seller_id, limit, offset]
        );

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                limit,
                offset,
                total: result.rows.length,
            },
        });
    } catch (error) {
        console.error('❌ Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

/**
 * GET /api/notifications/:id
 * Get specific notification by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        // Paksa type dengan 'as string'
        const id = parseInt(req.params.id as string, 10);

        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid notification ID',
            });
        }

        const result = await query(
            `SELECT * FROM audit_logs
             WHERE id = $1 AND entity_type = 'notifications'`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Notification not found',
            });
        }

        res.json({
            success: true,
            data: result.rows[0],
        });
    } catch (error) {
        console.error('❌ Error fetching notification:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
});

export default router;