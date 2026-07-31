import { Kafka, logLevel } from 'kafkajs';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Gunakan kafka:9092 (nama service di docker-compose)
const brokers = process.env.KAFKA_BROKERS
    ? process.env.KAFKA_BROKERS.split(',')
    : ['kafka:9092'];

console.log('📡 Kafka brokers:', brokers);
console.log('🔍 KAFKA_BROKERS from env:', process.env.KAFKA_BROKERS);

const kafka = new Kafka({
    clientId: 'settlement-engine',
    brokers: brokers,
    logLevel: logLevel.ERROR,
    connectionTimeout: 10000,
    requestTimeout: 30000,
    retry: {
        initialRetryTime: 300,
        retries: 8,
    },
});

export const producer = kafka.producer({
    maxInFlightRequests: 5,
    idempotent: true,
    transactionTimeout: 30000,
});

export const consumer = kafka.consumer({
    groupId: 'settlement-notification-service',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    rebalanceTimeout: 60000,
});

export const deadLetterConsumer = kafka.consumer({
    groupId: 'settlement-dlq-consumer',
});

export const admin = kafka.admin();

export default kafka;