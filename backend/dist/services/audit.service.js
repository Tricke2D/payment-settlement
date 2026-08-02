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
exports.auditLog = auditLog;
exports.getAuditTrail = getAuditTrail;
async function auditLog(client, entityType, entityId, action, previousState, newState, userId, reason) {
    try {
        await client.query(`INSERT INTO audit_logs (
        entity_type, entity_id, action, previous_state, new_state, 
        user_id, reason, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, [
            entityType,
            entityId,
            action,
            JSON.stringify(previousState),
            JSON.stringify(newState),
            userId,
            reason,
        ]);
        console.log(`📝 Audit logged: ${action} on ${entityType}/${entityId}`);
    }
    catch (error) {
        console.error('❌ Failed to log audit:', error);
        throw error;
    }
}
async function getAuditTrail(entityType, entityId, limit = 50) {
    const { query } = await Promise.resolve().then(() => __importStar(require('./database.service')));
    const result = await query(`SELECT * FROM audit_logs 
     WHERE entity_type = $1 AND entity_id = $2 
     ORDER BY created_at DESC 
     LIMIT $3`, [entityType, entityId, limit]);
    return result.rows;
}
