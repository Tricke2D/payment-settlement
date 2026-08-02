import { Kafka, logLevel } from 'kafkajs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Jika di production dan tidak ada KAFKA_BROKERS, nonaktifkan
const isKafkaEnabled = !!process.env.KAFKA_BROKERS && process.env.KAFKA_BROKERS !== 'localhost:29092';

console.log(`📡 Kafka enabled: ${isKafkaEnabled}`);

const kafka = isKafkaEnabled ? new Kafka({
    clientId: 'settlement-engine',
    brokers: process.env.KAFKA_BROKERS?.split(',') || [],
    logLevel: logLevel.ERROR,
    connectionTimeout: 10000,
    requestTimeout: 30000,
    retry: {
        initialRetryTime: 300,
        retries: 8,
    },
}) : null;

// Export yang aman
export const producer = kafka?.producer({
    maxInFlightRequests: 5,
    idempotent: true,
    transactionTimeout: 30000,
});

export const consumer = kafka?.consumer({
    groupId: 'settlement-notification-service',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    rebalanceTimeout: 60000,
});

export const deadLetterConsumer = kafka?.consumer({
    groupId: 'settlement-dlq-consumer',
});

export const admin = kafka?.admin();

export default kafka;