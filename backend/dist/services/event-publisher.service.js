"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventPublisher = void 0;
const kafka_config_1 = require("../config/kafka.config");
class EventPublisher {
    constructor() {
        this.isConnected = false;
    }
    async connect() {
        // Jika producer tidak tersedia (Kafka disabled), skip
        if (!kafka_config_1.producer) {
            console.log('⚠️ Kafka producer not available, skipping connect');
            this.isConnected = false;
            return;
        }
        try {
            await kafka_config_1.producer.connect();
            this.isConnected = true;
            console.log('✅ Kafka Producer connected');
        }
        catch (error) {
            console.error('❌ Failed to connect Kafka producer:', error);
            throw error;
        }
    }
    async disconnect() {
        if (!kafka_config_1.producer || !this.isConnected) {
            this.isConnected = false;
            return;
        }
        try {
            await kafka_config_1.producer.disconnect();
            this.isConnected = false;
            console.log('✅ Kafka Producer disconnected');
        }
        catch (error) {
            console.error('❌ Error disconnecting producer:', error);
        }
    }
    async publishSettlementEvent(event) {
        if (!kafka_config_1.producer || !this.isConnected) {
            console.log(`⚠️ Kafka disabled, skipping event publish: ${event.event_type}`);
            return;
        }
        try {
            await kafka_config_1.producer.send({
                topic: 'settlement-events',
                messages: [
                    {
                        key: event.settlement_id,
                        value: JSON.stringify(event),
                        headers: {
                            'event-type': event.event_type,
                            'timestamp': new Date().toISOString(),
                            'correlation-id': event.event_id,
                        },
                    },
                ],
            });
            console.log(`📤 Settlement event published: ${event.event_type} for ${event.settlement_id}`);
        }
        catch (error) {
            console.error('❌ Failed to publish settlement event:', error);
            throw error;
        }
    }
    async publishNotificationEvent(event) {
        if (!kafka_config_1.producer || !this.isConnected) {
            console.log(`⚠️ Kafka disabled, skipping notification: ${event.event_type}`);
            return;
        }
        try {
            await kafka_config_1.producer.send({
                topic: 'notifications',
                messages: [
                    {
                        key: event.recipient_id,
                        value: JSON.stringify(event),
                        headers: {
                            'notification-type': event.event_type,
                            'channel': event.channel,
                            'priority': event.priority,
                            'timestamp': new Date().toISOString(),
                        },
                    },
                ],
            });
            console.log(`📬 Notification event published: ${event.event_type} to ${event.recipient_id}`);
        }
        catch (error) {
            console.error('❌ Failed to publish notification event:', error);
            throw error;
        }
    }
    async publishToDeadLetterQueue(originalTopic, event, reason, retryCount) {
        if (!kafka_config_1.producer || !this.isConnected) {
            console.log(`⚠️ Kafka disabled, skipping DLQ publish`);
            return;
        }
        try {
            const dlqEvent = {
                dlq_id: `DLQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                original_topic: originalTopic,
                original_event: event,
                failure_reason: reason,
                retry_count: retryCount,
                status: 'pending_manual_review',
            };
            await kafka_config_1.producer.send({
                topic: 'settlement-dlq',
                messages: [
                    {
                        key: dlqEvent.dlq_id,
                        value: JSON.stringify(dlqEvent),
                        headers: {
                            'original-topic': originalTopic,
                            'failure-reason': reason,
                            'timestamp': new Date().toISOString(),
                        },
                    },
                ],
            });
            console.log(`⚠️ Event sent to DLQ: ${reason} (retry #${retryCount})`);
        }
        catch (error) {
            console.error('❌ Failed to publish to DLQ:', error);
            throw error;
        }
    }
}
exports.eventPublisher = new EventPublisher();
