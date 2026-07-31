// src/services/database.service.ts
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Type untuk query result - dengan constraint QueryResultRow
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
        const result = await pool.query<T>(text, params);
        const duration = Date.now() - start;
        console.log(`✅ Executed query: ${text.slice(0, 100)}... (${duration}ms)`);
        return result;
    } catch (error) {
        console.error('❌ Database query error:', error);
        throw error;
    }
}

// Untuk query yang tidak memerlukan tipe spesifik (return any)
export async function queryRaw(
    text: string,
    params?: any[]
): Promise<QueryResult<any>> {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`✅ Executed query: ${text.slice(0, 100)}... (${duration}ms)`);
        return result;
    } catch (error) {
        console.error('❌ Database query error:', error);
        throw error;
    }
}

export async function getConnection(): Promise<PoolClient> {
    try {
        const client = await pool.connect();
        return client;
    } catch (error) {
        console.error('❌ Failed to get database connection:', error);
        throw error;
    }
}

// Close pool
export async function closePool(): Promise<void> {
    try {
        await pool.end();
        console.log('✅ Database pool closed');
    } catch (error) {
        console.error('❌ Error closing pool:', error);
        throw error;
    }
}

export default {
    query,
    queryRaw,
    getConnection,
    closePool
};