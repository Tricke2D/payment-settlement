"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const settlements_1 = __importDefault(require("./routes/settlements"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const event_publisher_service_1 = require("./services/event-publisher.service");
const event_consumer_service_1 = require("./services/event-consumer.service");
const prom_client_1 = require("prom-client");
const reconciliation_service_1 = require("./services/reconciliation.service");
const admin_1 = __importDefault(require("./routes/admin"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = __importDefault(require("./docs/swagger"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Mengaktifkan trust proxy
app.set('trust proxy', 1);
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Logging middleware
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default));
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swagger_1.default);
});
// Rate limiting - 100 request per 15 menit
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100,
    message: {
        success: false,
        error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);
// Routes
app.use('/api/settlements', settlements_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/payment', payment_routes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            http: 'running',
            database: 'connected',
            kafka: 'connected',
        },
    });
});
// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', prom_client_1.register.contentType);
        const metrics = await prom_client_1.register.metrics();
        res.send(metrics);
    }
    catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).send('Error fetching metrics');
    }
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// ===== HANYA SATU DEKLARASI PORT =====
const PORT = parseInt(process.env.PORT || '3001', 10);
// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('\n🛑 Shutting down gracefully...');
    try {
        await event_publisher_service_1.eventPublisher.disconnect();
        await event_consumer_service_1.eventConsumer.disconnect();
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
// Start server (pakai PORT yang sudah dideklarasikan)
const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ Settlement Engine API running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    // Initialize Kafka
    try {
        if (process.env.KAFKA_BROKERS && process.env.KAFKA_BROKERS !== 'localhost:29092') {
            await event_publisher_service_1.eventPublisher.connect();
            await event_consumer_service_1.eventConsumer.connect();
            await event_consumer_service_1.eventConsumer.startSettlementEventConsumer();
            await event_consumer_service_1.eventConsumer.startDLQConsumer();
            console.log('✅ Kafka initialized');
        }
        else {
            console.log('⚠️ Kafka disabled in production');
        }
    }
    catch (error) {
        console.error('❌ Failed to initialize Kafka:', error);
    }
    // Start reconciliation scheduler
    (0, reconciliation_service_1.startReconciliationScheduler)();
    console.log('✅ Reconciliation scheduler started');
});
