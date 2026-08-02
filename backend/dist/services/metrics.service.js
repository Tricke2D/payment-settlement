"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconciliationDurationHistogram = exports.reconciliationDiscrepancyGauge = exports.reconciliationExecutedCounter = exports.httpRequestsCounter = exports.httpRequestDurationHistogram = exports.databaseConnectionPoolGauge = exports.databaseQueryDurationHistogram = exports.notificationFailedCounter = exports.notificationSentCounter = exports.dlqMaxRetriesExceededCounter = exports.dlqEventCounter = exports.kafkaEventProcessingDurationHistogram = exports.kafkaEventProcessedCounter = exports.kafkaEventPublishedCounter = exports.settlementDurationHistogram = exports.settlementAmountGauge = exports.settlementFailureCounter = exports.settlementSuccessCounter = void 0;
exports.getMetrics = getMetrics;
exports.recordSettlementSuccess = recordSettlementSuccess;
exports.recordSettlementFailure = recordSettlementFailure;
exports.recordKafkaEventPublished = recordKafkaEventPublished;
exports.recordKafkaEventProcessed = recordKafkaEventProcessed;
exports.recordNotificationSent = recordNotificationSent;
exports.recordNotificationFailed = recordNotificationFailed;
exports.recordDLQEvent = recordDLQEvent;
exports.recordDLQMaxRetriesExceeded = recordDLQMaxRetriesExceeded;
exports.recordReconciliationExecuted = recordReconciliationExecuted;
exports.recordReconciliationDiscrepancy = recordReconciliationDiscrepancy;
const prom_client_1 = require("prom-client");
// ===== COLLECT DEFAULT METRICS =====
(0, prom_client_1.collectDefaultMetrics)(); // Tanpa option
/**
 * BUSINESS METRICS (KPIs)
 */
// Settlement success rate
exports.settlementSuccessCounter = new prom_client_1.Counter({
    name: 'settlement_success_total',
    help: 'Total successful settlements',
    labelNames: ['seller_id', 'status'],
});
exports.settlementFailureCounter = new prom_client_1.Counter({
    name: 'settlement_failure_total',
    help: 'Total failed settlements',
    labelNames: ['seller_id', 'reason'],
});
// Settlement amount metrics
exports.settlementAmountGauge = new prom_client_1.Gauge({
    name: 'settlement_amount_total_idr',
    help: 'Total settlement amount in IDR',
    labelNames: ['seller_id', 'status'],
});
// Settlement processing time (latency)
exports.settlementDurationHistogram = new prom_client_1.Histogram({
    name: 'settlement_duration_seconds',
    help: 'Time taken to complete settlement (in seconds)',
    labelNames: ['phase', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
});
/**
 * TECHNICAL METRICS
 */
// Kafka event processing
exports.kafkaEventPublishedCounter = new prom_client_1.Counter({
    name: 'kafka_events_published_total',
    help: 'Total Kafka events published',
    labelNames: ['topic', 'event_type'],
});
exports.kafkaEventProcessedCounter = new prom_client_1.Counter({
    name: 'kafka_events_processed_total',
    help: 'Total Kafka events processed',
    labelNames: ['topic', 'status'],
});
exports.kafkaEventProcessingDurationHistogram = new prom_client_1.Histogram({
    name: 'kafka_event_processing_duration_seconds',
    help: 'Time taken to process Kafka event',
    labelNames: ['topic', 'event_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});
// Dead Letter Queue metrics
exports.dlqEventCounter = new prom_client_1.Counter({
    name: 'dlq_events_total',
    help: 'Total events sent to Dead Letter Queue',
    labelNames: ['original_topic', 'retry_count'],
});
exports.dlqMaxRetriesExceededCounter = new prom_client_1.Counter({
    name: 'dlq_max_retries_exceeded_total',
    help: 'Events that exceeded max retries in DLQ',
    labelNames: ['original_topic'],
});
// Notification metrics
exports.notificationSentCounter = new prom_client_1.Counter({
    name: 'notifications_sent_total',
    help: 'Total notifications sent',
    labelNames: ['channel', 'event_type'],
});
exports.notificationFailedCounter = new prom_client_1.Counter({
    name: 'notifications_failed_total',
    help: 'Total notifications failed',
    labelNames: ['channel', 'reason'],
});
// Database metrics
exports.databaseQueryDurationHistogram = new prom_client_1.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Database query execution time',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});
exports.databaseConnectionPoolGauge = new prom_client_1.Gauge({
    name: 'database_connection_pool_size',
    help: 'Current database connection pool size',
    labelNames: ['status'],
});
// API metrics
exports.httpRequestDurationHistogram = new prom_client_1.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});
exports.httpRequestsCounter = new prom_client_1.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
});
/**
 * RECONCILIATION METRICS
 */
exports.reconciliationExecutedCounter = new prom_client_1.Counter({
    name: 'reconciliation_executed_total',
    help: 'Total reconciliation runs',
    labelNames: ['status'],
});
exports.reconciliationDiscrepancyGauge = new prom_client_1.Gauge({
    name: 'reconciliation_discrepancy_amount_idr',
    help: 'Total discrepancy amount found in reconciliation',
    labelNames: ['seller_id', 'discrepancy_type'],
});
exports.reconciliationDurationHistogram = new prom_client_1.Histogram({
    name: 'reconciliation_duration_seconds',
    help: 'Time taken to run reconciliation',
    labelNames: ['status'],
    buckets: [1, 5, 10, 30, 60, 300],
});
/**
 * Export Prometheus registry
 */
function getMetrics() {
    return prom_client_1.register.metrics();
}
/**
 * Helper functions for metrics recording
 */
function recordSettlementSuccess(sellerId, amount, durationSeconds) {
    console.log(`📊 Recording settlement success: seller=${sellerId}, amount=${amount}`);
    exports.settlementSuccessCounter.inc({ seller_id: String(sellerId), status: 'completed' });
    exports.settlementAmountGauge.inc({ seller_id: String(sellerId), status: 'completed' }, amount);
    exports.settlementDurationHistogram.observe({ phase: 'total', status: 'success' }, durationSeconds);
}
function recordSettlementFailure(sellerId, reason) {
    console.log(`📊 Recording settlement failure: seller=${sellerId}, reason=${reason}`);
    exports.settlementFailureCounter.inc({ seller_id: String(sellerId), reason });
}
function recordKafkaEventPublished(topic, eventType) {
    exports.kafkaEventPublishedCounter.inc({ topic, event_type: eventType });
}
function recordKafkaEventProcessed(topic, status) {
    exports.kafkaEventProcessedCounter.inc({ topic, status });
}
function recordNotificationSent(channel, eventType) {
    exports.notificationSentCounter.inc({ channel, event_type: eventType });
}
function recordNotificationFailed(channel, reason) {
    exports.notificationFailedCounter.inc({ channel, reason });
}
function recordDLQEvent(originalTopic, retryCount) {
    exports.dlqEventCounter.inc({ original_topic: originalTopic, retry_count: String(retryCount) });
}
function recordDLQMaxRetriesExceeded(originalTopic) {
    exports.dlqMaxRetriesExceededCounter.inc({ original_topic: originalTopic });
}
function recordReconciliationExecuted(status, durationSeconds) {
    exports.reconciliationExecutedCounter.inc({ status });
    exports.reconciliationDurationHistogram.observe({ status }, durationSeconds);
}
function recordReconciliationDiscrepancy(sellerId, amount, type) {
    exports.reconciliationDiscrepancyGauge.inc({ seller_id: String(sellerId), discrepancy_type: type }, amount);
}
