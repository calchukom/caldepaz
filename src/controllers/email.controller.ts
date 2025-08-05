import { Request, Response, NextFunction } from 'express';
import { sendReceiptEmail, ReceiptEmailRequest } from '../middleware/googleMailer';
import { ResponseUtil } from '../middleware/response';
import { ErrorFactory } from '../middleware/appError';
import { logger, LogCategory } from '../middleware/logger';

/**
 * Email Controller for handling frontend email requests
 */
export class EmailController {

    /**
     * Send receipt email with custom HTML content
     * @route POST /api/email/send
     */
    async sendReceiptEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { to, subject, html, text } = req.body;

            // Validate required fields
            if (!to) {
                throw ErrorFactory.badRequest('Recipient email address is required');
            }

            if (!subject) {
                throw ErrorFactory.badRequest('Email subject is required');
            }

            if (!html) {
                throw ErrorFactory.badRequest('Email HTML content is required');
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(to)) {
                throw ErrorFactory.badRequest('Invalid email address format');
            }

            const emailRequest: ReceiptEmailRequest = {
                to,
                subject,
                html,
                text: text || 'Thank you for your booking with CARLEB CALEB VEHICLE RENT!'
            };

            const result = await sendReceiptEmail(emailRequest);

            if (result.success) {
                logger.info(LogCategory.EMAIL, `Receipt email sent successfully to: ${to}`);
                ResponseUtil.success(res, {
                    email_sent: true,
                    recipient: to,
                    subject,
                    timestamp: new Date(),
                    environment: process.env.NODE_ENV || 'development'
                }, 'Receipt email sent successfully');
            } else {
                logger.error(LogCategory.EMAIL, `Receipt email failed: ${result.error}`);
                throw ErrorFactory.internal(`Email sending failed: ${result.message}`);
            }

        } catch (error) {
            next(error);
        }
    }

    /**
     * Health check for email service
     * @route GET /api/email/health
     */
    async checkEmailHealth(req: Request, res: Response, next: NextFunction) {
        try {
            const config = {
                email_sender: process.env.EMAIL_SENDER ? 'Configured' : 'Not configured',
                email_password: process.env.EMAIL_PASSWORD ? 'Configured' : 'Not configured',
                node_env: process.env.NODE_ENV || 'development',
                smtp_host: 'smtp.gmail.com',
                smtp_port: 587,
                features: {
                    receipt_emails: true,
                    retry_logic: true,
                    timeout_protection: true,
                    production_ready: true
                }
            };

            const isConfigured = config.email_sender === 'Configured' && config.email_password === 'Configured';

            ResponseUtil.success(res, {
                status: isConfigured ? 'healthy' : 'configuration_incomplete',
                configuration: config,
                timestamp: new Date(),
                production_url: 'https://momanyicalebcarrent-awf5ffdbh8fnhca5.southafricanorth-01.azurewebsites.net'
            }, `Email service is ${isConfigured ? 'healthy' : 'missing configuration'}`);

        } catch (error) {
            next(error);
        }
    }
}

export const emailController = new EmailController();
