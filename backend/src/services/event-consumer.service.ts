import { consumer, deadLetterConsumer } from '../config/kafka.config';
import { eventPublisher, SettlementEvent, NotificationEvent } from './event-publisher.service';
import { query } from './database.service';
import { notificationService } from './notification.service';

interface ProcessingResult {
    success: boolean;
    error?: string;
    retryable?: boolean;
}

class EventConsumer {
    private isConnected = false;

    async connect(): Promise<void> {
        // Gunakan ! untuk memberitahu TypeScript bahwa variable tidak undefined
        if (!consumer || !deadLetterConsumer) {
            console.log('⚠️ Kafka consumer not available, skipping connect');
            this.isConnected = false;
            return;
        }
        try {
            await consumer!.connect();
            await deadLetterConsumer!.connect();
            this.isConnected = true;
            console.log('✅ Kafka Consumers connected');
        } catch (error) {
            console.error('❌ Failed to connect Kafka consumers:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (!consumer || !deadLetterConsumer || !this.isConnected) {
            this.isConnected = false;
            return;
        }
        try {
            await consumer!.disconnect();
            await deadLetterConsumer!.disconnect();
            this.isConnected = false;
            console.log('✅ Kafka Consumers disconnected');
        } catch (error) {
            console.error('❌ Error disconnecting consumers:', error);
        }
    }

    async startSettlementEventConsumer(): Promise<void> {
        if (!consumer || !this.isConnected) {
            console.log('⚠️ Kafka consumer not available, skipping start');
            return;
        }
        try {
            await consumer!.subscribe({ topic: 'settlement-events', fromBeginning: false });
            await consumer!.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        if (!message.value) {
                            console.error('❌ Received empty message');
                            return;
                        }
                        const event: SettlementEvent = JSON.parse(message.value.toString());
                        console.log(`📥 Processing settlement event: ${event.event_type}`);
                        const result = await this.processSettlementEvent(event);
                        if (!result.success && result.retryable) {
                            await eventPublisher.publishToDeadLetterQueue(
                                topic,
                                event,
                                result.error || 'Unknown error',
                                0
                            );
                        }
                    } catch (error) {
                        console.error('❌ Error processing settlement event:', error);
                        await this.logFailedEvent({
                            topic,
                            message: message.value?.toString(),
                            error: (error as Error).message,
                        });
                    }
                },
            });
            console.log('🔄 Settlement event consumer started');
        } catch (error) {
            console.error('❌ Failed to start settlement event consumer:', error);
            throw error;
        }
    }

    async startDLQConsumer(): Promise<void> {
        if (!deadLetterConsumer || !this.isConnected) {
            console.log('⚠️ DLQ consumer not available, skipping start');
            return;
        }
        try {
            await deadLetterConsumer!.subscribe({ topic: 'settlement-dlq', fromBeginning: true });
            await deadLetterConsumer!.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        if (!message.value) return;
                        const dlqEvent = JSON.parse(message.value.toString());
                        const retryCount = dlqEvent.retry_count || 0;
                        const maxRetries = 5;
                        console.log(`🔄 DLQ processing: ${dlqEvent.original_topic} (retry #${retryCount}/${maxRetries})`);
                        if (retryCount >= maxRetries) {
                            await query(
                                `INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                                 VALUES ($1, $2, $3, $4, NOW())`,
                                [
                                    'dlq',
                                    dlqEvent.dlq_id,
                                    'dlq.max_retries_exceeded',
                                    JSON.stringify({
                                        dlq_event: dlqEvent,
                                        status: 'REQUIRES_MANUAL_INTERVENTION',
                                        timestamp: new Date().toISOString(),
                                    }),
                                ]
                            );
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
                            await eventPublisher.publishToDeadLetterQueue(
                                dlqEvent.original_topic,
                                originalEvent,
                                dlqEvent.failure_reason,
                                retryCount + 1
                            );
                        } else {
                            console.log(`✅ DLQ retry successful for settlement ${originalEvent.settlement_id}`);
                        }
                    } catch (error) {
                        console.error('❌ Error processing DLQ message:', error);
                    }
                },
            });
            console.log('🔄 Dead Letter Queue consumer started');
        } catch (error) {
            console.error('❌ Failed to start DLQ consumer:', error);
            throw error;
        }
    }

    private async processSettlementEvent(event: SettlementEvent): Promise<ProcessingResult> {
        try {
            const sellerResult = await query(
                `SELECT id, seller_code, name, email FROM sellers WHERE id = $1`,
                [event.seller_id]
            );
            if (sellerResult.rows.length === 0) {
                return {
                    success: false,
                    error: 'Seller not found',
                    retryable: false,
                };
            }
            const seller = sellerResult.rows[0];
            let notification: NotificationEvent | null = null;

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
                const result = await notificationService.send(notification);
                await query(
                    `INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                     VALUES ($1, $2, $3, $4, NOW())`,
                    [
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
                    ]
                );
                if (result.success) {
                    console.log(`✉️ Notification sent for settlement ${event.settlement_id}`);
                } else {
                    console.log(`⚠️ Notification failed for settlement ${event.settlement_id}: ${result.error}`);
                }
                return { success: result.success };
            }
            return { success: false, error: 'Unknown event type', retryable: false };
        } catch (error) {
            console.error('❌ Error processing event:', error);
            return {
                success: false,
                error: (error as Error).message,
                retryable: true,
            };
        }
    }

    private async logFailedEvent(data: any): Promise<void> {
        try {
            await query(
                `INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [
                    'kafka_error',
                    0,
                    'kafka.message_processing_failed',
                    JSON.stringify(data),
                ]
            );
        } catch (error) {
            console.error('❌ Failed to log failed event:', error);
        }
    }
}

export const eventConsumer = new EventConsumer();