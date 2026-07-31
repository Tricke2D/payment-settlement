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

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/settlements', settlementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

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

const PORT = process.env.PORT || 3001;

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

// Start server
const server = app.listen(PORT, async () => {
    console.log(`✅ Settlement Engine API running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);

    // Initialize Kafka
    try {
        await eventPublisher.connect();
        await eventConsumer.connect();
        await eventConsumer.startSettlementEventConsumer();
        await eventConsumer.startDLQConsumer();
        console.log('✅ Kafka initialized and consumers running');
    } catch (error) {
        console.error('❌ Failed to initialize Kafka:', error);
        console.error('⚠️  API will continue running without event streaming');
    }
    // Start reconciliation scheduler
    startReconciliationScheduler();
    console.log('✅ Reconciliation scheduler started');
});