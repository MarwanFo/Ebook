import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  MailService,
  SendEmailVerificationInput,
  SendPasswordChangedInput,
  SendPasswordResetInput,
  SendRegistrationAttemptAlertInput,
} from './mail.interface';

@Injectable()
export class SmtpMailService implements MailService {
  private readonly logger = new Logger(SmtpMailService.name);
  private transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('smtp.host') || 'localhost';
    const port = this.configService.get<number>('smtp.port') || 1025;
    const user = this.configService.get<string>('smtp.user');
    const pass = this.configService.get<string>('smtp.password');
    this.fromAddress =
      this.configService.get<string>('smtp.from') || 'BookFlow <noreply@bookflow.local>';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    if (host === 'localhost' || !user || !pass) {
      this.logger.warn(
        `[SMTP CONFIG WARNING] SMTP credentials not fully configured (host: ${host}, user: ${
          user ? 'SET' : 'MISSING'
        }, pass: ${
          pass ? 'SET' : 'MISSING'
        }). Real emails will NOT be sent unless SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD are defined in environment variables.`,
      );
    } else {
      this.logger.log(`[SMTP CONFIG] Mailer initialized with host: ${host}:${port}, user: ${user}`);
    }
  }

  /**
   * Dispatches password reset email.
   * STRICT AUDIT: Reset URLs and tokens are NEVER emitted to application logs.
   */
  async sendPasswordReset(input: SendPasswordResetInput): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.email,
        replyTo: this.fromAddress,
        headers: {
          'X-Auto-Response-Suppress': 'All',
        },
        subject: input.otp
          ? `${input.otp} is your BookFlow password reset code`
          : 'Reset your BookFlow password',
        text: `You recently requested to reset your password for your BookFlow account.\n\n${
          input.otp ? `Your 6-Digit Verification Code: ${input.otp}\n\n` : ''
        }Please visit the link below to set a new password:\n${input.resetUrl}\n\nThis code and link will expire at ${input.expiresAt.toISOString()}.\nIf you did not request a password reset, please ignore this email.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="margin-bottom: 24px;">
              <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">Reset Your BookFlow Password</h2>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
                You recently requested to reset your password for your BookFlow account.
              </p>
            </div>
            ${
              input.otp
                ? `
            <div style="text-align: center; margin: 28px 0;">
              <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Single-Use 6-Digit Code</span>
              <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #c25e00; font-family: monospace; background: #fff7ed; padding: 14px 28px; border-radius: 12px; display: inline-block; margin-top: 8px; border: 1px dashed #fdba74;">
                ${input.otp}
              </div>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 6px;">Valid for 15 minutes</p>
            </div>
            `
                : ''
            }
            <div style="margin: 24px 0; text-align: center;">
              <a href="${input.resetUrl}" style="display: inline-block; background-color: #c25e00; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                Reset Password Directly
              </a>
            </div>
            <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0 0 16px 0;">
              Or copy and paste this link into your browser:<br />
              <a href="${input.resetUrl}" style="color: #c25e00; word-break: break-all;">${input.resetUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">
              This link will expire at ${input.expiresAt.toISOString()}. If you did not request this, please ignore this email.
            </p>
          </div>
        `,
      });

      // Sanitized audit log without exposing token or URL
      const maskedEmail = this.maskEmail(input.email);
      this.logger.log(
        JSON.stringify({
          event: 'PASSWORD_RESET_EMAIL_DISPATCHED',
          recipient: maskedEmail,
          expiresAt: input.expiresAt.toISOString(),
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'PASSWORD_RESET_EMAIL_FAILED',
          recipient: this.maskEmail(input.email),
          error: error instanceof Error ? error.message : 'Unknown transport error',
        }),
      );

      if (this.configService.get<string>('NODE_ENV') !== 'production') {
        this.logger.warn(
          `\n==================== [DEV OTP HELPER] ====================\n` +
            `Recipient:   ${input.email}\n` +
            `6-Digit OTP: ${input.otp || 'N/A'}\n` +
            `Direct Link: ${input.resetUrl}\n` +
            `Reason:      SMTP transport failed (${error instanceof Error ? error.message : 'offline'}).\n` +
            `Setup Tip:   To send real emails to your Gmail inbox, add SMTP_USER & SMTP_PASSWORD to .env\n` +
            `==========================================================\n`,
        );
      }
    }
  }

  async sendPasswordChanged(input: SendPasswordChangedInput): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.email,
        replyTo: this.fromAddress,
        headers: {
          'X-Auto-Response-Suppress': 'All',
        },
        subject: 'Security Alert: Your BookFlow password was changed',
        text: `Your BookFlow account password was successfully updated at ${input.timestamp.toISOString()}.\n\nIf you did not make this change, please contact support immediately.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Changed</h2>
            <p>Your BookFlow account password was successfully updated at ${input.timestamp.toISOString()}.</p>
            <p>If you did not make this change, please contact support immediately.</p>
          </div>
        `,
      });

      this.logger.log(
        JSON.stringify({
          event: 'PASSWORD_CHANGED_EMAIL_DISPATCHED',
          recipient: this.maskEmail(input.email),
          timestamp: input.timestamp.toISOString(),
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'PASSWORD_CHANGED_EMAIL_FAILED',
          recipient: this.maskEmail(input.email),
          error: error instanceof Error ? error.message : 'Unknown transport error',
        }),
      );
    }
  }

  async sendEmailVerification(input: SendEmailVerificationInput): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.email,
        replyTo: this.fromAddress,
        headers: {
          'X-Auto-Response-Suppress': 'All',
        },
        subject: input.otp
          ? `${input.otp} is your BookFlow verification code`
          : 'Verify your BookFlow email address',
        text: `Welcome to BookFlow!\n\n${
          input.otp ? `Your 6-Digit Verification Code: ${input.otp}\n\n` : ''
        }Please verify your email address by visiting the link below:\n${input.verificationUrl}\n\nThis code and verification link expire at ${input.expiresAt.toISOString()}.\nIf you did not sign up for BookFlow, please disregard this email.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="margin-bottom: 24px;">
              <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">Welcome to BookFlow</h2>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
                Thank you for joining BookFlow. Please verify your email address to activate your reading sanctuary and secure your account.
              </p>
            </div>
            ${
              input.otp
                ? `
            <div style="text-align: center; margin: 28px 0;">
              <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px;">Single-Use 6-Digit Code</span>
              <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #c25e00; font-family: monospace; background: #fff7ed; padding: 14px 28px; border-radius: 12px; display: inline-block; margin-top: 8px; border: 1px dashed #fdba74;">
                ${input.otp}
              </div>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 6px;">Valid for 15 minutes</p>
            </div>
            `
                : ''
            }
            <div style="margin: 24px 0; text-align: center;">
              <a href="${input.verificationUrl}" style="display: inline-block; background-color: #c25e00; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                Verify Email Directly
              </a>
            </div>
            <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0 0 16px 0;">
              Or copy and paste this link into your browser:<br />
              <a href="${input.verificationUrl}" style="color: #c25e00; word-break: break-all;">${input.verificationUrl}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 11px; margin: 0;">
              This link will expire at ${input.expiresAt.toISOString()}. If you did not create a BookFlow account, no further action is required.
            </p>
          </div>
        `,
      });

      this.logger.log(
        JSON.stringify({
          event: 'EMAIL_VERIFICATION_DISPATCHED',
          recipient: this.maskEmail(input.email),
          expiresAt: input.expiresAt.toISOString(),
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'EMAIL_VERIFICATION_DISPATCH_FAILED',
          recipient: this.maskEmail(input.email),
          error: error instanceof Error ? error.message : 'Unknown transport error',
        }),
      );

      if (this.configService.get<string>('NODE_ENV') !== 'production') {
        this.logger.warn(
          `\n==================== [DEV OTP HELPER] ====================\n` +
            `Recipient:   ${input.email}\n` +
            `6-Digit OTP: ${input.otp || 'N/A'}\n` +
            `Direct Link: ${input.verificationUrl}\n` +
            `Reason:      SMTP transport failed (${error instanceof Error ? error.message : 'offline'}).\n` +
            `Setup Tip:   To send real emails to your Gmail inbox, add SMTP_USER & SMTP_PASSWORD to .env\n` +
            `==========================================================\n`,
        );
      }
    }
  }

  async sendRegistrationAttemptAlert(input: SendRegistrationAttemptAlertInput): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.email,
        replyTo: this.fromAddress,
        headers: {
          'X-Auto-Response-Suppress': 'All',
        },
        subject: 'Security Notice: Attempted Registration on BookFlow',
        text: `Someone recently attempted to create a BookFlow account using your email address.\n\nIf this was you, you already have an account! You can sign in here: ${input.loginUrl}\nOr reset your password here: ${input.resetUrl}\n\nIf this was NOT you, you can safely ignore this email. Your existing account remains protected with strong cryptography.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="margin-bottom: 24px;">
              <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin: 0 0 8px 0;">Account Registration Notice</h2>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
                Someone recently attempted to register a new BookFlow account using your email address.
              </p>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 12px 0 0 0;">
                Since you already have an account with us, no new account was created and no data was shared.
              </p>
            </div>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${input.loginUrl}" style="display: inline-block; background-color: #c25e00; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px; margin-right: 8px;">
                Sign In to BookFlow
              </a>
              <a href="${input.resetUrl}" style="display: inline-block; background-color: #f3f4f6; color: #374151; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px;">
                Reset Password
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #9ca3af; font-size: 11px; line-height: 1.5; margin: 0;">
              If this was not you, no action is needed. Your existing account is completely safe and unaffected.
            </p>
          </div>
        `,
      });

      this.logger.log(
        JSON.stringify({
          event: 'REGISTRATION_ATTEMPT_ALERT_DISPATCHED',
          recipient: this.maskEmail(input.email),
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'REGISTRATION_ATTEMPT_ALERT_FAILED',
          recipient: this.maskEmail(input.email),
          error: error instanceof Error ? error.message : 'Unknown transport error',
        }),
      );
    }
  }

  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return '***';
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
    return `${maskedName}@${domain}`;
  }
}
