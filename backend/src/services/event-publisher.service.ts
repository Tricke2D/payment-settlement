import { producer } from '../config/kafka.config';
import { AuditAction } from '../types';

export interface SettlementEvent {
    event_id: string;
    timestamp: Date;
    event_type: string;
    settlement_id: string;
    seller_id: number;
    amount: number;
    status: string;
    previous_status?: string;
    reason?: string;
    audit_action: AuditAction;
    metadata?: Record<string, any>;
}

export interface NotificationEvent {
    notification_id: string;
    timestamp: Date;
    event_type: string;
    recipient_type: string;
    recipient_id: string;
    title: string;
    message: string;
    channel: string;
    priority: 'low' | 'medium' | 'high';
    settlement_id?: string;
    retry_count?: number;
    metadata?: Record<string, any>;
}

class EventPublisher {
    private isConnected = false;

    async connect(): Promise<void> {
        try {
            await producer.connect();
            this.isConnected = true;
            console.log('✅ Kafka Producer connected');
        } catch (error) {
            console.error('❌ Failed to connect Kafka producer:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.isConnected) {
            await producer.disconnect();
            this.isConnected = false;
            console.log('✅ Kafka Producer disconnected');
        }
    }

    async publishSettlementEvent(event: SettlementEvent): Promise<void> {
        try {
            await producer.send({
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
                        partition: Math.abs(
                            event.settlement_id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
                        ) % 3,
                    },
                ],
            });

            console.log(
                `📤 Settlement event published: ${event.event_type} for settlement ${event.settlement_id}`
            );
        } catch (error) {
            console.error('❌ Failed to publish settlement event:', error);
            throw error;
        }
    }

    async publishNotificationEvent(event: NotificationEvent): Promise<void> {
        try {
            await producer.send({
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

            console.log(
                `📬 Notification event published: ${event.event_type} to ${event.recipient_id}`
            );
        } catch (error) {
            console.error('❌ Failed to publish notification event:', error);
            throw error;
        }
    }

    async publishToDeadLetterQueue(
        originalTopic: string,
        event: any,
        reason: string,
        retryCount: number
    ): Promise<void> {
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

            await producer.send({
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

            console.log(
                `⚠️  Event sent to DLQ: ${reason} (retry #${retryCount})`
            );
        } catch (error) {
            console.error('❌ Failed to publish to DLQ:', error);
            throw error;
        }
    }
}

export const eventPublisher = new EventPublisher();