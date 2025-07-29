import nodemailer from 'nodemailer';
import { logger, LogCategory } from "./logger";

// Email template types
export enum EmailTemplate {
  WELCOME = "welcome",
  PASSWORD_RESET = "password_reset",
  PASSWORD_RESET_SUCCESS = "password_reset_success",
  INVITATION = "invitation",
  GENERIC = "generic"
}

// Email data interfaces
export interface EmailData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  userType?: string;
  customMessage?: string;
  inviteCode?: string;
  role?: string;
  expiresIn?: string;
  acceptUrl?: string;
  verificationCode?: string;
  resetLink?: string;
  resetTime?: string;
}

// Email request interface
export interface EmailRequest {
  to: string;
  subject: string;
  template: string;
  data: EmailData;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
}

// Email response interface
export interface EmailResponse {
  success: boolean;
  message: string;
  error?: any;
}

// Create reusable transporter
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_SENDER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  return transporter;
};

// Template generators
const generateWelcomeEmailTemplate = (data: EmailData): string => {
  const { firstName, fullName, userType = 'user' } = data;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #2c3e50; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">Vehicle Rental Management System</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px;">
        <h2 style="color: #2c3e50;">Welcome ${firstName || fullName || ''}!</h2>
        <p>Thank you for joining our Vehicle Rental Management System. Your account has been created successfully.</p>
        <p>You have been registered as a <strong>${userType}</strong>.</p>
        <p>You can now log in to your account and start exploring our platform.</p>
        <div style="background-color: #ffffff; border-left: 4px solid #2c3e50; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;">${data.customMessage || 'Welcome aboard! We are excited to have you as part of our community.'}</p>
        </div>
        <p>If you have any questions, please do not hesitate to contact our support team.</p>
        <p>Best regards,<br/>Vehicle Rental Management System Team</p>
      </div>
      <div style="text-align: center; padding: 10px; font-size: 12px; color: #666;">
        <p>&copy; ${new Date().getFullYear()} Vehicle Rental Management System. All rights reserved.</p>
      </div>
    </div>
  `;
};

const generatePasswordResetTemplate = (data: EmailData): string => {
  const { firstName, verificationCode, customMessage } = data;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #2c3e50; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">Password Reset Request</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px;">
        <h2 style="color: #2c3e50;">Hello ${firstName || 'there'}!</h2>
        <p>We received a request to reset your password. If you did not make this request, you can safely ignore this email.</p>
        <div style="background-color: #ffffff; border: 1px solid #ddd; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #2c3e50;">Your password reset code is:</h3>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #2c3e50;">${verificationCode}</p>
          <p style="color: #777; font-size: 14px;">This code will expire in 15 minutes.</p>
        </div>
        <p>${customMessage || 'To reset your password, enter this code on the password reset page.'}</p>
        <p>If you did not request a password reset, please contact our support team immediately.</p>
        <p>Best regards,<br/>Vehicle Rental Management System Team</p>
      </div>
      <div style="text-align: center; padding: 10px; font-size: 12px; color: #666;">
        <p>&copy; ${new Date().getFullYear()} Vehicle Rental Management System. All rights reserved.</p>
      </div>
    </div>
  `;
};

const generatePasswordResetSuccessTemplate = (data: EmailData): string => {
  const { firstName, resetTime } = data;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #2c3e50; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">Password Reset Successful</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px;">
        <h2 style="color: #2c3e50;">Hello ${firstName || 'there'}!</h2>
        <p>Your password has been successfully reset.</p>
        <div style="background-color: #ffffff; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #2c3e50;">✓ Password Reset Complete</h3>
          <p><strong>Reset Time:</strong> ${resetTime || new Date().toLocaleString()}</p>
          <p style="color: #777; font-size: 14px;">If you did not perform this action, please contact our support team immediately.</p>
        </div>
        <p>Your account is now secure with the new password. You can log in using your new credentials.</p>
        <p>For your security, we recommend:</p>
        <ul>
          <li>Using a strong, unique password</li>
          <li>Enabling two-factor authentication if available</li>
          <li>Keeping your login credentials confidential</li>
        </ul>
        <p>If you have any concerns about your account security, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br/>Vehicle Rental Management System Team</p>
      </div>
      <div style="text-align: center; padding: 10px; font-size: 12px; color: #666;">
        <p>&copy; ${new Date().getFullYear()} Vehicle Rental Management System. All rights reserved.</p>
      </div>
    </div>
  `;
};

const generateInvitationTemplate = (data: EmailData): string => {
  const { inviteCode, role = 'user', expiresIn = '24 hours', acceptUrl } = data;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #2c3e50; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">You've Been Invited!</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px;">
        <h2 style="color: #2c3e50;">Vehicle Rental Management System Invitation</h2>
        <p>You have been invited to join our Vehicle Rental Management System as a <strong>${role}</strong>.</p>
        <p>To accept this invitation and create your account, please use the following invitation code:</p>
        <div style="background-color: #ffffff; border: 1px solid #ddd; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #2c3e50;">Your invitation code is:</h3>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #2c3e50;">${inviteCode}</p>
          <p style="color: #777; font-size: 14px;">This invitation expires in ${expiresIn}.</p>
        </div>
        ${acceptUrl ? `
          <div style="text-align: center; margin: 25px 0;">
            <a href="${acceptUrl}" style="background-color: #2c3e50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Accept Invitation</a>
          </div>
        ` : ''}
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>We look forward to having you onboard!</p>
        <p>Best regards,<br/>Vehicle Rental Management System Team</p>
      </div>
      <div style="text-align: center; padding: 10px; font-size: 12px; color: #666;">
        <p>&copy; ${new Date().getFullYear()} Vehicle Rental Management System. All rights reserved.</p>
      </div>
    </div>
  `;
};

const generateGenericEmailTemplate = (data: EmailData): string => {
  const { firstName, fullName, customMessage } = data;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #2c3e50; padding: 20px; border-radius: 5px 5px 0 0; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">Vehicle Rental Management System</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px;">
        <h2 style="color: #2c3e50;">Hello ${firstName || fullName || 'there'}!</h2>
        <div style="background-color: #ffffff; border-left: 4px solid #2c3e50; padding: 15px; margin: 20px 0;">
          <p style="margin: 0;">${customMessage || 'Thank you for using our service.'}</p>
        </div>
        <p>If you have any questions, please do not hesitate to contact our support team.</p>
        <p>Best regards,<br/>Vehicle Rental Management System Team</p>
      </div>
      <div style="text-align: center; padding: 10px; font-size: 12px; color: #666;">
        <p>&copy; ${new Date().getFullYear()} Vehicle Rental Management System. All rights reserved.</p>
      </div>
    </div>
  `;
};

// Main function to send emails
export const sendEmail = async (emailRequest: EmailRequest): Promise<EmailResponse> => {
  const { to, subject, template, data, cc, bcc, attachments } = emailRequest;

  try {
    logger.info(LogCategory.EMAIL, `Sending ${template} email to: ${to}`);

    let htmlContent = '';

    // Select template based on template type
    switch (template) {
      case EmailTemplate.WELCOME:
        htmlContent = generateWelcomeEmailTemplate(data);
        break;
      case EmailTemplate.PASSWORD_RESET:
        htmlContent = generatePasswordResetTemplate(data);
        break;
      case EmailTemplate.PASSWORD_RESET_SUCCESS:
        htmlContent = generatePasswordResetSuccessTemplate(data);
        break;
      case EmailTemplate.INVITATION:
        htmlContent = generateInvitationTemplate(data);
        break;
      case EmailTemplate.GENERIC:
      default:
        htmlContent = generateGenericEmailTemplate(data);
        break;
    }

    // Create transporter
    const transporter = createTransporter();

    // Setup email data
    const mailOptions = {
      from: `"Vehicle Rental System" <${process.env.EMAIL_SENDER}>`,
      to,
      subject,
      html: htmlContent,
      cc,
      bcc,
      attachments
    };

    // Skip actual sending in test environment
    if (process.env.NODE_ENV === 'test') {
      logger.info(LogCategory.EMAIL, `Test environment detected. Email would have been sent to: ${to}`);
      return {
        success: true,
        message: 'Email sending skipped in test environment'
      };
    }

    // Send mail
    await transporter.sendMail(mailOptions);

    logger.info(LogCategory.EMAIL, `Email sent successfully to: ${to}`);
    return {
      success: true,
      message: 'Email sent successfully'
    };

  } catch (error) {
    logger.error(LogCategory.EMAIL, `Failed to send email to: ${to} - ${error}`);
    return {
      success: false,
      message: 'Failed to send email',
      error
    };
  }
};

// For backwards compatibility with Jest mocks
export const sendNotificationEmail = sendEmail;
