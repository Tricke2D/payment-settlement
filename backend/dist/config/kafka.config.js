"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.admin = exports.deadLetterConsumer = exports.consumer = exports.producer = void 0;
const kafkajs_1 = require("kafkajs");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Jika di production dan tidak ada KAFKA_BROKERS, nonaktifkan
const isKafkaEnabled = !!process.env.KAFKA_BROKERS && process.env.KAFKA_BROKERS !== 'localhost:29092';
console.log(`📡 Kafka enabled: ${isKafkaEnabled}`);
const kafka = isKafkaEnabled ? new kafkajs_1.Kafka({
    clientId: 'settlement-engine',
    brokers: process.env.KAFKA_BROKERS?.split(',') || [],
    logLevel: kafkajs_1.logLevel.ERROR,
    connectionTimeout: 10000,
    requestTimeout: 30000,
    retry: {
        initialRetryTime: 300,
        retries: 8,
    },
}) : null;
// Export yang aman
exports.producer = kafka?.producer({
    maxInFlightRequests: 5,
    idempotent: true,
    transactionTimeout: 30000,
});
exports.consumer = kafka?.consumer({
    groupId: 'settlement-notification-service',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    rebalanceTimeout: 60000,
});
exports.deadLetterConsumer = kafka?.consumer({
    groupId: 'settlement-dlq-consumer',
});
exports.admin = kafka?.admin();
exports.default = kafka;
