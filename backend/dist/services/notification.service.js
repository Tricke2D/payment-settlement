"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const database_service_1 = require("./database.service");
const mail_1 = __importDefault(require("@sendgrid/mail"));
// ===== SET API KEY =====
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
if (SENDGRID_API_KEY) {
    mail_1.default.setApiKey(SENDGRID_API_KEY);
    console.log('✅ SendGrid initialized');
}
else {
    console.warn('⚠️ SENDGRID_API_KEY not set, using stub mode');
}
class NotificationService {
    /**
     * Send email notification using SendGrid
     */
    async sendEmail(payload) {
        try {
            // Jika SendGrid tidak di-set, pakai stub
            if (!SENDGRID_API_KEY) {
                console.log(`📧 [STUB] Sending email to ${payload.to}`);
                console.log(`   Subject: ${payload.subject}`);
                console.log(`   Body: ${payload.body}`);
                return {
                    success: true,
                    channel: 'email',
                    message_id: `STUB-${Date.now()}`,
                };
            }
            const msg = {
                to: payload.to,
                from: process.env.EMAIL_FROM || 'noreply@settlement.com',
                subject: payload.subject,
                html: payload.html || payload.body.replace(/\n/g, '<br>'),
            };
            await mail_1.default.send(msg);
            console.log(`📧 Email sent to ${payload.to}`);
            return {
                success: true,
                channel: 'email',
                message_id: `SG-${Date.now()}`,
            };
        }
        catch (error) {
            const errorMsg = error?.response?.body?.errors?.[0]?.message || error?.message || 'Unknown error';
            console.error('❌ SendGrid error:', errorMsg);
            return {
                success: false,
                channel: 'email',
                error: errorMsg,
            };
        }
    }
    /**
     * Send SMS notification (stub - integrate with Twilio/AWS SNS later)
     */
    async sendSMS(payload) {
        try {
            console.log(`📱 [STUB] Sending SMS to ${payload.phone}`);
            console.log(`   Message: ${payload.message}`);
            return {
                success: true,
                channel: 'sms',
                message_id: `SMS-${Date.now()}`,
            };
        }
        catch (error) {
            console.error('❌ Failed to send SMS:', error);
            return {
                success: false,
                channel: 'sms',
                error: error.message,
            };
        }
    }
    /**
     * Send push notification (stub)
     */
    async sendPushNotification(payload) {
        try {
            console.log(`🔔 [STUB] Sending push notification`);
            return {
                success: true,
                channel: 'push',
                message_id: `PUSH-${Date.now()}`,
            };
        }
        catch (error) {
            return {
                success: false,
                channel: 'push',
                error: error.message,
            };
        }
    }
    /**
     * Route notification to appropriate channel
     */
    async send(notification) {
        try {
            const sellerResult = await (0, database_service_1.query)(`SELECT email, seller_code FROM sellers WHERE seller_code = $1`, [notification.recipient_id]);
            if (sellerResult.rows.length === 0) {
                return {
                    success: false,
                    channel: notification.channel,
                    error: `Seller ${notification.recipient_id} not found`,
                };
            }
            const seller = sellerResult.rows[0];
            let result;
            switch (notification.channel) {
                case 'email':
                    result = await this.sendEmail({
                        to: seller.email,
                        subject: notification.title,
                        body: notification.message,
                        html: this.buildEmailHTML(notification),
                    });
                    break;
                case 'sms':
                    result = await this.sendSMS({
                        phone: '+6281234567890',
                        message: notification.message,
                    });
                    break;
                case 'push':
                    result = await this.sendPushNotification(notification);
                    break;
                default:
                    result = {
                        success: false,
                        channel: notification.channel,
                        error: `Unknown channel: ${notification.channel}`,
                    };
            }
            // Log notification delivery attempt
            if (result.success) {
                await (0, database_service_1.query)(`INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                     VALUES ($1, $2, $3, $4, NOW())`, [
                    'notifications',
                    notification.notification_id,
                    `notification.${notification.channel}.sent`,
                    JSON.stringify({
                        notification_id: notification.notification_id,
                        message_id: result.message_id,
                        recipient: notification.recipient_id,
                        channel: notification.channel,
                    }),
                ]);
                console.log(`✅ Notification sent via ${notification.channel}: ${result.message_id}`);
            }
            else {
                await (0, database_service_1.query)(`INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                     VALUES ($1, $2, $3, $4, NOW())`, [
                    'notifications',
                    notification.notification_id,
                    `notification.${notification.channel}.failed`,
                    JSON.stringify({
                        notification_id: notification.notification_id,
                        error: result.error,
                        recipient: notification.recipient_id,
                        channel: notification.channel,
                    }),
                ]);
                console.log(`❌ Notification failed via ${notification.channel}: ${result.error}`);
            }
            return result;
        }
        catch (error) {
            console.error('❌ Error sending notification:', error);
            return {
                success: false,
                channel: notification.channel,
                error: error.message,
            };
        }
    }
    /**
     * Build HTML email template
     */
    buildEmailHTML(notification) {
        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; }
                        .container { max-width: 600px; margin: 0 auto; }
                        .header { background-color: #f5f5f5; padding: 20px; }
                        .content { padding: 20px; }
                        .footer { background-color: #f5f5f5; padding: 10px; font-size: 12px; }
                        .success { color: #28a745; }
                        .error { color: #dc3545; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2>${notification.title}</h2>
                        </div>
                        <div class="content">
                            <p>${notification.message}</p>
                            <p>Settlement ID: ${notification.settlement_id}</p>
                            <p>Timestamp: ${new Date(notification.timestamp).toLocaleString('id-ID')}</p>
                        </div>
                        <div class="footer">
                            <p>© 2024 Payment Settlement Engine. All rights reserved.</p>
                        </div>
                    </div>
                </body>
            </html>
        `;
    }
}
exports.notificationService = new NotificationService();
