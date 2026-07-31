import { PoolClient } from 'pg';

export async function auditLog(
    client: PoolClient,
    entityType: string,
    entityId: number,
    action: string,
    previousState: any,
    newState: any,
    userId: number | null,
    reason?: string
): Promise<void> {
    try {
        await client.query(
            `INSERT INTO audit_logs (
        entity_type, entity_id, action, previous_state, new_state, 
        user_id, reason, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
                entityType,
                entityId,
                action,
                JSON.stringify(previousState),
                JSON.stringify(newState),
                userId,
                reason,
            ]
        );
        console.log(`📝 Audit logged: ${action} on ${entityType}/${entityId}`);
    } catch (error) {
        console.error('❌ Failed to log audit:', error);
        throw error;
    }
}

export async function getAuditTrail(
    entityType: string,
    entityId: number,
    limit: number = 50
) {
    const { query } = await import('./database.service');
    const result = await query(
        `SELECT * FROM audit_logs 
     WHERE entity_type = $1 AND entity_id = $2 
     ORDER BY created_at DESC 
     LIMIT $3`,
        [entityType, entityId, limit]
    );
    return result.rows;
}