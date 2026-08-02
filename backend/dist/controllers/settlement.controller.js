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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditTrail = exports.getSettlement = exports.phase2Commit = exports.phase1Lock = exports.initiate = void 0;
const settlementService = __importStar(require("../services/settlement.service"));
const database_service_1 = require("../services/database.service");
// POST /api/settlements/initiate - Start settlement process
const initiate = async (req, res) => {
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
    }
    catch (error) {
        console.error('Error initiating settlement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate settlement'
        });
    }
};
exports.initiate = initiate;
// POST /api/settlements/:settlementId/phase1-lock
const phase1Lock = async (req, res) => {
    try {
        const settlementId = req.params.settlementId;
        // Cari settlement berdasarkan settlement_id (string)
        const settlementResult = await (0, database_service_1.query)(`SELECT id FROM settlements WHERE settlement_id = $1`, [settlementId]);
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
    }
    catch (error) {
        console.error('Error in phase 1 lock:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to lock funds'
        });
    }
};
exports.phase1Lock = phase1Lock;
// POST /api/settlements/:settlementId/phase2-commit
const phase2Commit = async (req, res) => {
    try {
        const settlementId = req.params.settlementId;
        const settlementResult = await (0, database_service_1.query)(`SELECT id FROM settlements WHERE settlement_id = $1`, [settlementId]);
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
    }
    catch (error) {
        console.error('Error in phase 2 commit:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to commit transaction'
        });
    }
};
exports.phase2Commit = phase2Commit;
// GET /api/settlements/:settlementId
const getSettlement = async (req, res) => {
    try {
        const settlementId = req.params.settlementId;
        const result = await (0, database_service_1.query)(`SELECT s.*,
                    u.name as seller_name,
                    COUNT(si.id) as item_count
             FROM settlements s
                      LEFT JOIN sellers u ON s.seller_id = u.id
                      LEFT JOIN settlement_items si ON s.id = si.settlement_id
             WHERE s.settlement_id = $1
             GROUP BY s.id, u.name`, [settlementId]);
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
    }
    catch (error) {
        console.error('Error fetching settlement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settlement'
        });
    }
};
exports.getSettlement = getSettlement;
// GET /api/settlements/:settlementId/audit-trail
const getAuditTrail = async (req, res) => {
    try {
        const settlementId = req.params.settlementId;
        // Cari settlement berdasarkan settlement_id
        const settlementResult = await (0, database_service_1.query)(`SELECT id FROM settlements WHERE settlement_id = $1`, [settlementId]);
        if (settlementResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Settlement not found'
            });
        }
        const dbId = settlementResult.rows[0].id;
        const result = await (0, database_service_1.query)(`SELECT * FROM audit_logs 
             WHERE entity_type = 'settlements' AND entity_id = $1
             ORDER BY created_at DESC`, [dbId]);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error('Error fetching audit trail:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch audit trail'
        });
    }
};
exports.getAuditTrail = getAuditTrail;
