import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailService, SendPasswordChangedInput, SendPasswordResetInput } from './mail.interface';

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
    });
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
        subject: 'Reset your BookFlow password',
        text: `You recently requested to reset your password for your BookFlow account.\n\nPlease visit the link below to set a new password:\n${input.resetUrl}\n\nThis link will expire at ${input.expiresAt.toISOString()}.\nIf you did not request a password reset, please ignore this email.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>BookFlow Password Reset</h2>
            <p>You recently requested to reset your password for your BookFlow account.</p>
            <p><a href="${input.resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
            <p style="color: #6b7280; font-size: 12px;">This link will expire at ${input.expiresAt.toISOString()}. If you did not request this, please ignore this email.</p>
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
    }
  }

  async sendPasswordChanged(input: SendPasswordChangedInput): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.email,
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

  async sendEmailVerification(input: {
    email: string;
    verificationUrl: string;
    expiresAt: Date;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: input.email,
        subject: 'Verify your BookFlow email address',
        text: `Welcome to BookFlow!\n\nPlease verify your email address by visiting the link below:\n${input.verificationUrl}\n\nThis verification link expires at ${input.expiresAt.toISOString()}.\nIf you did not sign up for BookFlow, please disregard this email.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="margin-bottom: 24px;">
              <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">Welcome to BookFlow 📚</h2>
              <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0;">
                Thank you for joining BookFlow. Please verify your email address to activate your reading sanctuary and secure your account.
              </p>
            </div>
            <div style="margin: 28px 0; text-align: center;">
              <a href="${input.verificationUrl}" style="display: inline-block; background-color: #c25e00; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                Verify Email Address
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
