import { Kafka, logLevel } from 'kafkajs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Cek apakah Kafka diaktifkan
const isKafkaEnabled = !!process.env.KAFKA_BROKERS &&
    process.env.KAFKA_BROKERS !== 'localhost:29092' &&
    process.env.KAFKA_BROKERS !== 'kafka:9092';

console.log(`📡 Kafka enabled: ${isKafkaEnabled}`);
console.log(`📡 KAFKA_BROKERS: ${process.env.KAFKA_BROKERS}`);

// Buat kafka instance hanya jika enabled
const kafka = isKafkaEnabled ? new Kafka({
    clientId: 'settlement-engine',
    brokers: process.env.KAFKA_BROKERS?.split(',') || [],
    ssl: process.env.KAFKA_BROKERS?.includes('upstash') || process.env.KAFKA_BROKERS?.includes('confluent'),
    sasl: process.env.KAFKA_BROKERS?.includes('upstash') || process.env.KAFKA_BROKERS?.includes('confluent') ? {
        mechanism: 'scram-sha-256',
        username: process.env.KAFKA_SASL_USERNAME || '',
        password: process.env.KAFKA_SASL_PASSWORD || '',
    } : undefined,
    logLevel: logLevel.ERROR,
    connectionTimeout: 10000,
    requestTimeout: 30000,
    retry: {
        initialRetryTime: 300,
        retries: 8,
    },
}) : null;

// Export dengan fallback null
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