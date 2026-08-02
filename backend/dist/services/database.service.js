"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.queryRaw = queryRaw;
exports.getConnection = getConnection;
exports.closePool = closePool;
// src/services/database.service.ts
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
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
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`✅ Executed query: ${text.slice(0, 100)}... (${duration}ms)`);
        return result;
    }
    catch (error) {
        console.error('❌ Database query error:', error);
        throw error;
    }
}
// Untuk query yang tidak memerlukan tipe spesifik (return any)
async function queryRaw(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`✅ Executed query: ${text.slice(0, 100)}... (${duration}ms)`);
        return result;
    }
    catch (error) {
        console.error('❌ Database query error:', error);
        throw error;
    }
}
async function getConnection() {
    try {
        const client = await pool.connect();
        return client;
    }
    catch (error) {
        console.error('❌ Failed to get database connection:', error);
        throw error;
    }
}
// Close pool
async function closePool() {
    try {
        await pool.end();
        console.log('✅ Database pool closed');
    }
    catch (error) {
        console.error('❌ Error closing pool:', error);
        throw error;
    }
}
exports.default = {
    query,
    queryRaw,
    getConnection,
    closePool
};
