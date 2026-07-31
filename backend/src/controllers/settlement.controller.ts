// src/controllers/settlement.controller.ts
import { Request, Response } from 'express';
import * as settlementService from '../services/settlement.service';
import { query } from '../services/database.service';

// POST /api/settlements/initiate - Start settlement process
export const initiate = async (req: Request, res: Response) => {
    try {
        const result = await settlementService.initiateSettlement(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Failed to initiate settlement'
            });
        }

        res.status(201).json({
            success: true,
            data: {
                settlement_id: result.settlement_id
            }
        });
    } catch (error) {
        console.error('Error initiating settlement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate settlement'
        });
    }
};

// POST /api/settlements/:settlementId/phase1-lock
export const phase1Lock = async (req: Request, res: Response) => {
    try {
        const settlementId = req.params.settlementId as string;

        // Cari settlement berdasarkan settlement_id (string)
        const settlementResult = await query(
            `SELECT id FROM settlements WHERE settlement_id = $1`,
            [settlementId]
        );

        if (settlementResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Settlement not found'
            });
        }

        const dbId = settlementResult.rows[0].id;

        const result = await settlementService.phase1LockFunds({
            settlement_id: dbId,
            ...req.body
        });

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Failed to lock funds'
            });
        }

        res.json({
            success: true,
            data: {
                locked_amount: result.locked_amount
            }
        });
    } catch (error) {
        console.error('Error in phase 1 lock:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to lock funds'
        });
    }
};

// POST /api/settlements/:settlementId/phase2-commit
export const phase2Commit = async (req: Request, res: Response) => {
    try {
        const settlementId = req.params.settlementId as string;

        const settlementResult = await query(
            `SELECT id FROM settlements WHERE settlement_id = $1`,
            [settlementId]
        );

        if (settlementResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Settlement not found'
            });
        }

        const dbId = settlementResult.rows[0].id;
        const result = await settlementService.phase2Commit(dbId);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error || 'Failed to commit transaction'
            });
        }

        res.json({
            success: true,
            data: {
                completed_at: result.completed_at
            }
        });
    } catch (error) {
        console.error('Error in phase 2 commit:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to commit transaction'
        });
    }
};

// GET /api/settlements/:settlementId
export const getSettlement = async (req: Request, res: Response) => {
    try {
        const settlementId = req.params.settlementId as string;

        const result = await query(
            `SELECT s.*,
                    u.name as seller_name,
                    COUNT(si.id) as item_count
             FROM settlements s
                      LEFT JOIN sellers u ON s.seller_id = u.id
                      LEFT JOIN settlement_items si ON s.id = si.settlement_id
             WHERE s.settlement_id = $1
             GROUP BY s.id, u.name`,
            [settlementId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Settlement not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching settlement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settlement'
        });
    }
};

// GET /api/settlements/:settlementId/audit-trail
export const getAuditTrail = async (req: Request, res: Response) => {
    try {
        const settlementId = req.params.settlementId as string;

        // Cari settlement berdasarkan settlement_id
        const settlementResult = await query(
            `SELECT id FROM settlements WHERE settlement_id = $1`,
            [settlementId]
        );

        if (settlementResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Settlement not found'
            });
        }

        const dbId = settlementResult.rows[0].id;

        const result = await query(
            `SELECT * FROM audit_logs 
             WHERE entity_type = 'settlements' AND entity_id = $1
             ORDER BY created_at DESC`,
            [dbId]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching audit trail:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit trail'
        });
    }
};