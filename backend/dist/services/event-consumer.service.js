"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventConsumer = void 0;
const kafka_config_1 = require("../config/kafka.config");
const event_publisher_service_1 = require("./event-publisher.service");
const database_service_1 = require("./database.service");
const notification_service_1 = require("./notification.service");
class EventConsumer {
    constructor() {
        this.isConnected = false;
    }
    async connect() {
        // Gunakan ! untuk memberitahu TypeScript bahwa variable tidak undefined
        if (!kafka_config_1.consumer || !kafka_config_1.deadLetterConsumer) {
            console.log('⚠️ Kafka consumer not available, skipping connect');
            this.isConnected = false;
            return;
        }
        try {
            await kafka_config_1.consumer.connect();
            await kafka_config_1.deadLetterConsumer.connect();
            this.isConnected = true;
            console.log('✅ Kafka Consumers connected');
        }
        catch (error) {
            console.error('❌ Failed to connect Kafka consumers:', error);
            throw error;
        }
    }
    async disconnect() {
        if (!kafka_config_1.consumer || !kafka_config_1.deadLetterConsumer || !this.isConnected) {
            this.isConnected = false;
            return;
        }
        try {
            await kafka_config_1.consumer.disconnect();
            await kafka_config_1.deadLetterConsumer.disconnect();
            this.isConnected = false;
            console.log('✅ Kafka Consumers disconnected');
        }
        catch (error) {
            console.error('❌ Error disconnecting consumers:', error);
        }
    }
    async startSettlementEventConsumer() {
        if (!kafka_config_1.consumer || !this.isConnected) {
            console.log('⚠️ Kafka consumer not available, skipping start');
            return;
        }
        try {
            await kafka_config_1.consumer.subscribe({ topic: 'settlement-events', fromBeginning: false });
            await kafka_config_1.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        if (!message.value) {
                            console.error('❌ Received empty message');
                            return;
                        }
                        const event = JSON.parse(message.value.toString());
                        console.log(`📥 Processing settlement event: ${event.event_type}`);
                        const result = await this.processSettlementEvent(event);
                        if (!result.success && result.retryable) {
                            await event_publisher_service_1.eventPublisher.publishToDeadLetterQueue(topic, event, result.error || 'Unknown error', 0);
                        }
                    }
                    catch (error) {
                        console.error('❌ Error processing settlement event:', error);
                        await this.logFailedEvent({
                            topic,
                            message: message.value?.toString(),
                            error: error.message,
                        });
                    }
                },
            });
            console.log('🔄 Settlement event consumer started');
        }
        catch (error) {
            console.error('❌ Failed to start settlement event consumer:', error);
            throw error;
        }
    }
    async startDLQConsumer() {
        if (!kafka_config_1.deadLetterConsumer || !this.isConnected) {
            console.log('⚠️ DLQ consumer not available, skipping start');
            return;
        }
        try {
            await kafka_config_1.deadLetterConsumer.subscribe({ topic: 'settlement-dlq', fromBeginning: true });
            await kafka_config_1.deadLetterConsumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        if (!message.value)
                            return;
                        const dlqEvent = JSON.parse(message.value.toString());
                        const retryCount = dlqEvent.retry_count || 0;
                        const maxRetries = 5;
                        console.log(`🔄 DLQ processing: ${dlqEvent.original_topic} (retry #${retryCount}/${maxRetries})`);
                        if (retryCount >= maxRetries) {
                            await (0, database_service_1.query)(`INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                                 VALUES ($1, $2, $3, $4, NOW())`, [
                                'dlq',
                                dlqEvent.dlq_id,
                                'dlq.max_retries_exceeded',
                                JSON.stringify({
                                    dlq_event: dlqEvent,
                                    status: 'REQUIRES_MANUAL_INTERVENTION',
                                    timestamp: new Date().toISOString(),
                                }),
                            ]);
                            console.log(`🆘 DLQ event exceeded max retries: ${dlqEvent.dlq_id}`);
                            return;
                        }
                        const waitTime = Math.pow(2, retryCount) * 1000;
                        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                        await new Promise((resolve) => setTimeout(resolve, waitTime));
                        const originalEvent = dlqEvent.original_event;
                        const retryResult = await this.processSettlementEvent(originalEvent);
                        if (!retryResult.success) {
                            dlqEvent.retry_count = retryCount + 1;
                            await event_publisher_service_1.eventPublisher.publishToDeadLetterQueue(dlqEvent.original_topic, originalEvent, dlqEvent.failure_reason, retryCount + 1);
                        }
                        else {
                            console.log(`✅ DLQ retry successful for settlement ${originalEvent.settlement_id}`);
                        }
                    }
                    catch (error) {
                        console.error('❌ Error processing DLQ message:', error);
                    }
                },
            });
            console.log('🔄 Dead Letter Queue consumer started');
        }
        catch (error) {
            console.error('❌ Failed to start DLQ consumer:', error);
            throw error;
        }
    }
    async processSettlementEvent(event) {
        try {
            const sellerResult = await (0, database_service_1.query)(`SELECT id, seller_code, name, email FROM sellers WHERE id = $1`, [event.seller_id]);
            if (sellerResult.rows.length === 0) {
                return {
                    success: false,
                    error: 'Seller not found',
                    retryable: false,
                };
            }
            const seller = sellerResult.rows[0];
            let notification = null;
            switch (event.event_type) {
                case 'settlement.initiated':
                    notification = {
                        notification_id: `NOTIF-${Date.now()}`,
                        timestamp: event.timestamp,
                        event_type: 'settlement.initiated',
                        recipient_type: 'seller',
                        recipient_id: seller.seller_code,
                        title: 'Settlement Initiated',
                        message: `Your settlement of ${event.amount.toLocaleString('id-ID')} IDR has been initiated.`,
                        channel: 'email',
                        priority: 'medium',
                        settlement_id: event.settlement_id,
                        metadata: { seller_name: seller.name, seller_email: seller.email },
                    };
                    break;
                case 'settlement.phase1_locked':
                    notification = {
                        notification_id: `NOTIF-${Date.now()}`,
                        timestamp: event.timestamp,
                        event_type: 'settlement.phase1_locked',
                        recipient_type: 'seller',
                        recipient_id: seller.seller_code,
                        title: 'Settlement Funds Locked',
                        message: `Funds of ${event.amount.toLocaleString('id-ID')} IDR have been locked.`,
                        channel: 'email',
                        priority: 'medium',
                        settlement_id: event.settlement_id,
                        metadata: { seller_name: seller.name, seller_email: seller.email },
                    };
                    break;
                case 'settlement.completed':
                    notification = {
                        notification_id: `NOTIF-${Date.now()}`,
                        timestamp: event.timestamp,
                        event_type: 'settlement.completed',
                        recipient_type: 'seller',
                        recipient_id: seller.seller_code,
                        title: '✅ Settlement Completed',
                        message: `Settlement of ${event.amount.toLocaleString('id-ID')} IDR completed successfully!`,
                        channel: 'email',
                        priority: 'high',
                        settlement_id: event.settlement_id,
                        metadata: { seller_name: seller.name, seller_email: seller.email },
                    };
                    break;
                case 'settlement.failed':
                    notification = {
                        notification_id: `NOTIF-${Date.now()}`,
                        timestamp: event.timestamp,
                        event_type: 'settlement.failed',
                        recipient_type: 'seller',
                        recipient_id: seller.seller_code,
                        title: '❌ Settlement Failed',
                        message: `Settlement of ${event.amount.toLocaleString('id-ID')} IDR failed. Please contact support.`,
                        channel: 'email',
                        priority: 'high',
                        settlement_id: event.settlement_id,
                        metadata: {
                            seller_name: seller.name,
                            seller_email: seller.email,
                            error_reason: event.reason,
                        },
                    };
                    break;
            }
            if (notification) {
                const result = await notification_service_1.notificationService.send(notification);
                await (0, database_service_1.query)(`INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                     VALUES ($1, $2, $3, $4, NOW())`, [
                    'notifications',
                    event.settlement_id,
                    `notification.${notification.event_type}`,
                    JSON.stringify({
                        notification_id: notification.notification_id,
                        success: result.success,
                        channel: result.channel,
                        message_id: result.message_id,
                        error: result.error,
                    }),
                ]);
                if (result.success) {
                    console.log(`✉️ Notification sent for settlement ${event.settlement_id}`);
                }
                else {
                    console.log(`⚠️ Notification failed for settlement ${event.settlement_id}: ${result.error}`);
                }
                return { success: result.success };
            }
            return { success: false, error: 'Unknown event type', retryable: false };
        }
        catch (error) {
            console.error('❌ Error processing event:', error);
            return {
                success: false,
                error: error.message,
                retryable: true,
            };
        }
    }
    async logFailedEvent(data) {
        try {
            await (0, database_service_1.query)(`INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`, [
                'kafka_error',
                0,
                'kafka.message_processing_failed',
                JSON.stringify(data),
            ]);
        }
        catch (error) {
            console.error('❌ Failed to log failed event:', error);
        }
    }
}
exports.eventConsumer = new EventConsumer();
