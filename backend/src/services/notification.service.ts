// src/services/notification.service.ts
import { NotificationEvent } from './event-publisher.service';
import { query } from './database.service';

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
     * Send email notification (stub - integrate with SendGrid/AWS SES later)
     */
    private async sendEmail(payload: EmailPayload): Promise<NotificationResult> {
        try {
            console.log(`📧 [STUB] Sending email to ${payload.to}`);
            console.log(`   Subject: ${payload.subject}`);
            console.log(`   Body: ${payload.body}`);

            // TODO: Integrate with real email service
            // const response = await sendgrid.send({
            //   to: payload.to,
            //   from: process.env.SENDGRID_FROM_EMAIL,
            //   subject: payload.subject,
            //   html: payload.html || payload.body,
            // });

            const messageId = `EMAIL-${Date.now()}`;

            return {
                success: true,
                channel: 'email',
                message_id: messageId,
            };
        } catch (error) {
            console.error('❌ Failed to send email:', error);
            return {
                success: false,
                channel: 'email',
                error: (error as Error).message,
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

            // TODO: Integrate with real SMS service
            // const response = await twilio.messages.create({
            //   body: payload.message,
            //   from: process.env.TWILIO_PHONE_NUMBER,
            //   to: payload.phone,
            // });

            const messageId = `SMS-${Date.now()}`;

            return {
                success: true,
                channel: 'sms',
                message_id: messageId,
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

            // TODO: Integrate with Firebase Cloud Messaging
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
            // Get seller info for contact details
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
                        phone: '+6281234567890', // Placeholder
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

                console.log(
                    `✅ Notification sent via ${notification.channel}: ${result.message_id}`
                );
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