import { Request, Response, NextFunction } from 'express';
import { sendEmail, EmailTemplate } from '../middleware/googleMailer';
import { ResponseUtil } from '../middleware/response';
import { ErrorFactory } from '../middleware/appError';
import { logger, LogCategory } from '../middleware/logger';

/**
 * Test Email Controller for Production Verification
 */
export class TestEmailController {

    /**
     * Test email sending functionality
     */
    async testEmailSending(req: Request, res: Response, next: NextFunction) {
        try {
            const { to, subject, template = EmailTemplate.GENERIC, data } = req.body;

            if (!to) {
                throw ErrorFactory.badRequest('Email address is required');
            }

            // Default test data
            const emailData = {
                firstName: 'Test User',
                customMessage: 'This is a test email from the Vehicle Rental System production environment.',
                ...data
            };

            const emailRequest = {
                to,
                subject: subject || 'Test Email from Vehicle Rental System',
                template,
                data: emailData
            };

            const result = await sendEmail(emailRequest);

            if (result.success) {
                logger.info(LogCategory.EMAIL, `Test email sent successfully to: ${to}`);
                ResponseUtil.success(res, {
                    email_sent: true,
                    recipient: to,
                    template,
                    timestamp: new Date(),
                    environment: process.env.NODE_ENV || 'development'
                }, 'Test email sent successfully');
            } else {
                logger.error(LogCategory.EMAIL, `Test email failed: ${result.error}`);
                throw ErrorFactory.internal(`Email sending failed: ${result.message}`);
            }

        } catch (error) {
            next(error);
        }
    }

    /**
     * Test all email templates
     */
    async testAllEmailTemplates(req: Request, res: Response, next: NextFunction) {
        try {
            const { to } = req.body;

            if (!to) {
                throw ErrorFactory.badRequest('Email address is required');
            }

            const templates = [
                {
                    template: EmailTemplate.WELCOME,
                    subject: 'Welcome Test Email',
                    data: {
                        firstName: 'Test User',
                        userType: 'customer',
                        customMessage: 'Welcome to our Vehicle Rental System! This is a test email.'
                    }
                },
                {
                    template: EmailTemplate.PASSWORD_RESET,
                    subject: 'Password Reset Test Email',
                    data: {
                        firstName: 'Test User',
                        verificationCode: '123456',
                        customMessage: 'This is a test password reset email.'
                    }
                },
                {
                    template: EmailTemplate.PASSWORD_RESET_SUCCESS,
                    subject: 'Password Reset Success Test Email',
                    data: {
                        firstName: 'Test User',
                        resetTime: new Date().toLocaleString()
                    }
                },
                {
                    template: EmailTemplate.INVITATION,
                    subject: 'Invitation Test Email',
                    data: {
                        inviteCode: 'TEST123',
                        role: 'admin',
                        expiresIn: '24 hours'
                    }
                },
                {
                    template: EmailTemplate.GENERIC,
                    subject: 'Generic Test Email',
                    data: {
                        firstName: 'Test User',
                        customMessage: 'This is a generic test email from the Vehicle Rental System.'
                    }
                }
            ];

            const results = [];

            for (const templateTest of templates) {
                try {
                    const emailRequest = {
                        to,
                        subject: templateTest.subject,
                        template: templateTest.template,
                        data: templateTest.data
                    };

                    const result = await sendEmail(emailRequest);
                    results.push({
                        template: templateTest.template,
                        success: result.success,
                        message: result.message,
                        error: result.error
                    });

                    // Wait 2 seconds between emails to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (error) {
                    results.push({
                        template: templateTest.template,
                        success: false,
                        message: 'Template test failed',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const totalCount = results.length;

            logger.info(LogCategory.EMAIL, `Email template test completed: ${successCount}/${totalCount} successful`);

            ResponseUtil.success(res, {
                recipient: to,
                total_templates: totalCount,
                successful_sends: successCount,
                failed_sends: totalCount - successCount,
                results,
                timestamp: new Date(),
                environment: process.env.NODE_ENV || 'development'
            }, `Email template test completed: ${successCount}/${totalCount} successful`);

        } catch (error) {
            next(error);
        }
    }

    /**
     * Test email configuration
     */
    async testEmailConfiguration(req: Request, res: Response, next: NextFunction) {
        try {
            const config = {
                email_sender: process.env.EMAIL_SENDER ? 'Configured' : 'Not configured',
                email_password: process.env.EMAIL_PASSWORD ? 'Configured' : 'Not configured',
                node_env: process.env.NODE_ENV || 'development',
                smtp_host: 'smtp.gmail.com',
                smtp_port: 587,
                smtp_secure: false,
                features: {
                    retry_logic: true,
                    exponential_backoff: true,
                    timeout_protection: true,
                    production_verification: true,
                    tls_configuration: true
                }
            };

            const isConfigured = config.email_sender === 'Configured' && config.email_password === 'Configured';

            logger.info(LogCategory.EMAIL, `Email configuration check: ${isConfigured ? 'Ready' : 'Incomplete'}`);

            ResponseUtil.success(res, {
                configuration: config,
                status: isConfigured ? 'ready' : 'incomplete',
                timestamp: new Date(),
                production_url: 'https://momanyicalebcarrent-awf5ffdbh8fnhca5.southafricanorth-01.azurewebsites.net'
            }, `Email configuration is ${isConfigured ? 'ready' : 'incomplete'}`);

        } catch (error) {
            next(error);
        }
    }
}

export const testEmailController = new TestEmailController();
