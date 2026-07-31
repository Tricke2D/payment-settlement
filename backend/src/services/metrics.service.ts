import { Counter, Gauge, Histogram, register, collectDefaultMetrics } from 'prom-client';

// ===== COLLECT DEFAULT METRICS =====
collectDefaultMetrics();  // Tanpa option

/**
 * BUSINESS METRICS (KPIs)
 */

// Settlement success rate
export const settlementSuccessCounter = new Counter({
    name: 'settlement_success_total',
    help: 'Total successful settlements',
    labelNames: ['seller_id', 'status'],
});

export const settlementFailureCounter = new Counter({
    name: 'settlement_failure_total',
    help: 'Total failed settlements',
    labelNames: ['seller_id', 'reason'],
});

// Settlement amount metrics
export const settlementAmountGauge = new Gauge({
    name: 'settlement_amount_total_idr',
    help: 'Total settlement amount in IDR',
    labelNames: ['seller_id', 'status'],
});

// Settlement processing time (latency)
export const settlementDurationHistogram = new Histogram({
    name: 'settlement_duration_seconds',
    help: 'Time taken to complete settlement (in seconds)',
    labelNames: ['phase', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});

/**
 * TECHNICAL METRICS
 */

// Kafka event processing
export const kafkaEventPublishedCounter = new Counter({
    name: 'kafka_events_published_total',
    help: 'Total Kafka events published',
    labelNames: ['topic', 'event_type'],
});

export const kafkaEventProcessedCounter = new Counter({
    name: 'kafka_events_processed_total',
    help: 'Total Kafka events processed',
    labelNames: ['topic', 'status'],
});

export const kafkaEventProcessingDurationHistogram = new Histogram({
    name: 'kafka_event_processing_duration_seconds',
    help: 'Time taken to process Kafka event',
    labelNames: ['topic', 'event_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

// Dead Letter Queue metrics
export const dlqEventCounter = new Counter({
    name: 'dlq_events_total',
    help: 'Total events sent to Dead Letter Queue',
    labelNames: ['original_topic', 'retry_count'],
});

export const dlqMaxRetriesExceededCounter = new Counter({
    name: 'dlq_max_retries_exceeded_total',
    help: 'Events that exceeded max retries in DLQ',
    labelNames: ['original_topic'],
});

// Notification metrics
export const notificationSentCounter = new Counter({
    name: 'notifications_sent_total',
    help: 'Total notifications sent',
    labelNames: ['channel', 'event_type'],
});

export const notificationFailedCounter = new Counter({
    name: 'notifications_failed_total',
    help: 'Total notifications failed',
    labelNames: ['channel', 'reason'],
});

// Database metrics
export const databaseQueryDurationHistogram = new Histogram({
    name: 'database_query_duration_seconds',
    help: 'Database query execution time',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const databaseConnectionPoolGauge = new Gauge({
    name: 'database_connection_pool_size',
    help: 'Current database connection pool size',
    labelNames: ['status'],
});

// API metrics
export const httpRequestDurationHistogram = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const httpRequestsCounter = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
});

/**
 * RECONCILIATION METRICS
 */

export const reconciliationExecutedCounter = new Counter({
    name: 'reconciliation_executed_total',
    help: 'Total reconciliation runs',
    labelNames: ['status'],
});

export const reconciliationDiscrepancyGauge = new Gauge({
    name: 'reconciliation_discrepancy_amount_idr',
    help: 'Total discrepancy amount found in reconciliation',
    labelNames: ['seller_id', 'discrepancy_type'],
});

export const reconciliationDurationHistogram = new Histogram({
    name: 'reconciliation_duration_seconds',
    help: 'Time taken to run reconciliation',
    labelNames: ['status'],
    buckets: [1, 5, 10, 30, 60, 300],
});

/**
 * Export Prometheus registry
 */
export function getMetrics() {
    return register.metrics();
}

/**
 * Helper functions for metrics recording
 */

export function recordSettlementSuccess(sellerId: number, amount: number, durationSeconds: number) {
    console.log(`📊 Recording settlement success: seller=${sellerId}, amount=${amount}`);
    settlementSuccessCounter.inc({ seller_id: String(sellerId), status: 'completed' });
    settlementAmountGauge.inc({ seller_id: String(sellerId), status: 'completed' }, amount);
    settlementDurationHistogram.observe({ phase: 'total', status: 'success' }, durationSeconds);
}

export function recordSettlementFailure(sellerId: number, reason: string) {
    console.log(`📊 Recording settlement failure: seller=${sellerId}, reason=${reason}`);
    settlementFailureCounter.inc({ seller_id: String(sellerId), reason });
}

export function recordKafkaEventPublished(topic: string, eventType: string) {
    kafkaEventPublishedCounter.inc({ topic, event_type: eventType });
}

export function recordKafkaEventProcessed(topic: string, status: string) {
    kafkaEventProcessedCounter.inc({ topic, status });
}

export function recordNotificationSent(channel: string, eventType: string) {
    notificationSentCounter.inc({ channel, event_type: eventType });
}

export function recordNotificationFailed(channel: string, reason: string) {
    notificationFailedCounter.inc({ channel, reason });
}

export function recordDLQEvent(originalTopic: string, retryCount: number) {
    dlqEventCounter.inc({ original_topic: originalTopic, retry_count: String(retryCount) });
}

export function recordDLQMaxRetriesExceeded(originalTopic: string) {
    dlqMaxRetriesExceededCounter.inc({ original_topic: originalTopic });
}

export function recordReconciliationExecuted(status: string, durationSeconds: number) {
    reconciliationExecutedCounter.inc({ status });
    reconciliationDurationHistogram.observe({ status }, durationSeconds);
}

export function recordReconciliationDiscrepancy(sellerId: number, amount: number, type: string) {
    reconciliationDiscrepancyGauge.inc(
        { seller_id: String(sellerId), discrepancy_type: type },
        amount
    );
}