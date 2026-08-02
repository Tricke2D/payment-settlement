// src/services/notification.service.ts
import { NotificationEvent } from './event-publisher.service';
import { query } from './database.service';
import sgMail from '@sendgrid/mail';

// ===== SET API KEY =====
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
    console.log('✅ SendGrid initialized');
} else {
    console.warn('⚠️ SENDGRID_API_KEY not set, using stub mode');
}

interface EmailPayload {
    to: string;
    subject: string;
    body: string;
    html?: string;
}

interface SMSPayload {
    phone: string;
    message: string;
}

interface NotificationResult {
    success: boolean;
    channel: string;
    message_id?: string;
    error?: string;
}

class NotificationService {
    /**
     * Send email notification using SendGrid
     */
    private async sendEmail(payload: EmailPayload): Promise<NotificationResult> {
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

            await sgMail.send(msg);
            console.log(`📧 Email sent to ${payload.to}`);

            return {
                success: true,
                channel: 'email',
                message_id: `SG-${Date.now()}`,
            };
        } catch (error: any) {
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
    private async sendSMS(payload: SMSPayload): Promise<NotificationResult> {
        try {
            console.log(`📱 [STUB] Sending SMS to ${payload.phone}`);
            console.log(`   Message: ${payload.message}`);
            return {
                success: true,
                channel: 'sms',
                message_id: `SMS-${Date.now()}`,
            };
        } catch (error) {
            console.error('❌ Failed to send SMS:', error);
            return {
                success: false,
                channel: 'sms',
                error: (error as Error).message,
            };
        }
    }

    /**
     * Send push notification (stub)
     */
    private async sendPushNotification(payload: any): Promise<NotificationResult> {
        try {
            console.log(`🔔 [STUB] Sending push notification`);
            return {
                success: true,
                channel: 'push',
                message_id: `PUSH-${Date.now()}`,
            };
        } catch (error) {
            return {
                success: false,
                channel: 'push',
                error: (error as Error).message,
            };
        }
    }

    /**
     * Route notification to appropriate channel
     */
    async send(notification: NotificationEvent): Promise<NotificationResult> {
        try {
            const sellerResult = await query(
                `SELECT email, seller_code FROM sellers WHERE seller_code = $1`,
                [notification.recipient_id]
            );

            if (sellerResult.rows.length === 0) {
                return {
                    success: false,
                    channel: notification.channel,
                    error: `Seller ${notification.recipient_id} not found`,
                };
            }

            const seller = sellerResult.rows[0];

            let result: NotificationResult;

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
                await query(
                    `INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                     VALUES ($1, $2, $3, $4, NOW())`,
                    [
                        'notifications',
                        notification.notification_id,
                        `notification.${notification.channel}.sent`,
                        JSON.stringify({
                            notification_id: notification.notification_id,
                            message_id: result.message_id,
                            recipient: notification.recipient_id,
                            channel: notification.channel,
                        }),
                    ]
                );
                console.log(`✅ Notification sent via ${notification.channel}: ${result.message_id}`);
            } else {
                await query(
                    `INSERT INTO audit_logs (entity_type, entity_id, action, new_state, created_at)
                     VALUES ($1, $2, $3, $4, NOW())`,
                    [
                        'notifications',
                        notification.notification_id,
                        `notification.${notification.channel}.failed`,
                        JSON.stringify({
                            notification_id: notification.notification_id,
                            error: result.error,
                            recipient: notification.recipient_id,
                            channel: notification.channel,
                        }),
                    ]
                );
                console.log(`❌ Notification failed via ${notification.channel}: ${result.error}`);
            }

            return result;
        } catch (error) {
            console.error('❌ Error sending notification:', error);
            return {
                success: false,
                channel: notification.channel,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Build HTML email template
     */
    private buildEmailHTML(notification: NotificationEvent): string {
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

export const notificationService = new NotificationService();