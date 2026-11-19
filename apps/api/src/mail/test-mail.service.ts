import { Injectable } from '@nestjs/common';
import {
  MailService,
  SendEmailVerificationInput,
  SendPasswordChangedInput,
  SendPasswordResetInput,
  SendRegistrationAttemptAlertInput,
  SentEmailRecord,
} from './mail.interface';

@Injectable()
export class TestMailService implements MailService {
  private readonly sentEmails: SentEmailRecord[] = [];

  async sendPasswordReset(input: SendPasswordResetInput): Promise<void> {
    this.sentEmails.push({
      to: input.email,
      subject: 'Reset your BookFlow password',
      text: `Reset link: ${input.resetUrl}${input.otp ? ` | OTP: ${input.otp}` : ''}`,
      timestamp: new Date(),
    });
  }

  async sendPasswordChanged(input: SendPasswordChangedInput): Promise<void> {
    this.sentEmails.push({
      to: input.email,
      subject: 'Security Alert: Your BookFlow password was changed',
      timestamp: input.timestamp,
    });
  }

  async sendEmailVerification(input: SendEmailVerificationInput): Promise<void> {
    this.sentEmails.push({
      to: input.email,
      subject: 'Verify your BookFlow email address',
      text: `Verification link: ${input.verificationUrl}${input.otp ? ` | OTP: ${input.otp}` : ''}`,
      timestamp: new Date(),
    });
  }

  async sendRegistrationAttemptAlert(input: SendRegistrationAttemptAlertInput): Promise<void> {
    this.sentEmails.push({
      to: input.email,
      subject: 'Security Notice: Attempted Registration on BookFlow',
      text: `Someone attempted to create an account with your email. Login: ${input.loginUrl}, Reset: ${input.resetUrl}`,
      timestamp: new Date(),
    });
  }

  getSentEmails(): SentEmailRecord[] {
    return [...this.sentEmails];
  }

  clear(): void {
    this.sentEmails.length = 0;
  }
}
