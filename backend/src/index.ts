import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { getMetrics } from './services/metrics.service';
import settlementRoutes from './routes/settlements';
import notificationRoutes from './routes/notifications';
import { eventPublisher } from './services/event-publisher.service';
import { eventConsumer } from './services/event-consumer.service';
import { register } from 'prom-client';
import { startReconciliationScheduler } from './services/reconciliation.service';
import adminRoutes from './routes/admin';
import paymentRoutes from './routes/payment.routes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();

// Mengaktifkan trust proxy
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Rate limiting - 100 request per 15 menit
const limiter = rateLimit({
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
app.use('/api/settlements', settlementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payment', paymentRoutes);

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
        res.set('Content-Type', register.contentType);
        const metrics = await register.metrics();
        res.send(metrics);
    } catch (error) {
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
        await eventPublisher.disconnect();
        await eventConsumer.disconnect();
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    } catch (error) {
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
            await eventPublisher.connect();
            await eventConsumer.connect();
            await eventConsumer.startSettlementEventConsumer();
            await eventConsumer.startDLQConsumer();
            console.log('✅ Kafka initialized');
        } else {
            console.log('⚠️ Kafka disabled in production');
        }
    } catch (error) {
        console.error('❌ Failed to initialize Kafka:', error);
    }
    // Start reconciliation scheduler
    startReconciliationScheduler();
    console.log('✅ Reconciliation scheduler started');
});