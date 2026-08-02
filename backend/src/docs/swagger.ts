import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Payment Settlement Engine API',
            version: '1.0.0',
            description: 'API untuk mengelola settlement pembayaran dengan two-phase commit',
            contact: {
                name: 'Your Name',
                email: 'mhdsyukronzakka@gmail.com',
            },
        },
        servers: [
            {
                url: 'https://payment-settlement-app.fly.dev/api',
                description: 'Production Server',
            },
            {
                url: 'http://localhost:3001/api',
                description: 'Development Server',
            },
        ],
        tags: [
            { name: 'Settlements', description: 'Manajemen settlement' },
            { name: 'Admin', description: 'Operasi admin' },
            { name: 'Notifications', description: 'Manajemen notifikasi' },
        ],
        components: {
            schemas: {
                Settlement: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        settlement_id: { type: 'string' },
                        seller_id: { type: 'number' },
                        total_amount: { type: 'number' },
                        status: { type: 'string', enum: ['pending', 'phase_1_locked', 'completed', 'failed', 'rolled_back'] },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                InitiateSettlementRequest: {
                    type: 'object',
                    required: ['seller_id', 'settlement_period_start', 'settlement_period_end', 'idempotency_key'],
                    properties: {
                        seller_id: { type: 'number', example: 1 },
                        settlement_period_start: { type: 'string', format: 'date', example: '2024-01-01' },
                        settlement_period_end: { type: 'string', format: 'date', example: '2024-01-31' },
                        idempotency_key: { type: 'string', example: 'unique-key-001' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string' },
                    },
                },
            },
        },
    },
    apis: ['./src/routes/*.ts'],
};

export default swaggerJsdoc(options);