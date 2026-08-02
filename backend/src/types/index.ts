// Settlement statuses
export enum SettlementStatus {
    PENDING = 'pending',
    PHASE_1_LOCKED = 'phase_1_locked',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    ROLLED_BACK = 'rolled_back',
}

export enum TransactionStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded',
    DISPUTED = 'disputed',
}

export enum AuditAction {
    SETTLEMENT_INITIATED = 'settlement_initiated',
    PHASE_1_LOCK_REQUESTED = 'phase_1_lock_requested',
    PHASE_1_LOCK_ACQUIRED = 'phase_1_lock_acquired',
    PHASE_1_LOCK_FAILED = 'phase_1_lock_failed',
    PHASE_2_COMMIT = 'phase_2_commit',
    PHASE_2_ROLLBACK = 'phase_2_rollback',
    SETTLEMENT_COMPLETED = 'settlement_completed',
    SETTLEMENT_FAILED = 'settlement_failed',
    PAYMENT_RECEIVED = 'payment_received',
}

// Interfaces
export interface Seller {
    id: number;
    seller_code: string;
    name: string;
    email: string;
    bank_account_number: string;
    bank_name: string;
    status: 'active' | 'suspended' | 'closed';
    total_balance: number;
}

export interface Transaction {
    id: number;
    transaction_id: string;
    seller_id: number;
    amount: number;
    status: TransactionStatus;
    created_at: Date;
}

export interface Settlement {
    id: number;
    settlement_id: string;
    seller_id: number;
    total_amount: number;
    status: SettlementStatus;
    idempotency_key?: string;
    created_at: Date;
}

export interface SettlementInitiateRequest {
    seller_id: number;
    settlement_period_start: string; // YYYY-MM-DD
    settlement_period_end: string;   // YYYY-MM-DD
    idempotency_key: string;
}

export interface SettlementPhase1LockRequest {
    settlement_id: number;
    amount: number;
}

export interface SettlementPhase2CommitRequest {
    settlement_id: number;
}

export interface AuditLog {
    id: number;
    entity_type: string;
    entity_id: number;
    action: string;
    new_state: any;
    created_at: Date;
}