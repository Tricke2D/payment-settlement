"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditAction = exports.TransactionStatus = exports.SettlementStatus = void 0;
// Settlement statuses
var SettlementStatus;
(function (SettlementStatus) {
    SettlementStatus["PENDING"] = "pending";
    SettlementStatus["PHASE_1_LOCKED"] = "phase_1_locked";
    SettlementStatus["PROCESSING"] = "processing";
    SettlementStatus["COMPLETED"] = "completed";
    SettlementStatus["FAILED"] = "failed";
    SettlementStatus["ROLLED_BACK"] = "rolled_back";
})(SettlementStatus || (exports.SettlementStatus = SettlementStatus = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["PROCESSING"] = "processing";
    TransactionStatus["COMPLETED"] = "completed";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["REFUNDED"] = "refunded";
    TransactionStatus["DISPUTED"] = "disputed";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var AuditAction;
(function (AuditAction) {
    AuditAction["SETTLEMENT_INITIATED"] = "settlement_initiated";
    AuditAction["PHASE_1_LOCK_REQUESTED"] = "phase_1_lock_requested";
    AuditAction["PHASE_1_LOCK_ACQUIRED"] = "phase_1_lock_acquired";
    AuditAction["PHASE_1_LOCK_FAILED"] = "phase_1_lock_failed";
    AuditAction["PHASE_2_COMMIT"] = "phase_2_commit";
    AuditAction["PHASE_2_ROLLBACK"] = "phase_2_rollback";
    AuditAction["SETTLEMENT_COMPLETED"] = "settlement_completed";
    AuditAction["SETTLEMENT_FAILED"] = "settlement_failed";
    AuditAction["PAYMENT_RECEIVED"] = "payment_received";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
