import { Injectable } from '@nestjs/common';
import {
  MailService,
  SendPasswordChangedInput,
  SendPasswordResetInput,
  SentEmailRecord,
} from './mail.interface';

@Injectable()
export class TestMailService implements MailService {
  private readonly sentEmails: SentEmailRecord[] = [];

  async sendPasswordReset(input: SendPasswordResetInput): Promise<void> {
    this.sentEmails.push({
      to: input.email,
      subject: 'Reset your BookFlow password',
      text: `Reset link: ${input.resetUrl}`,
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

  getSentEmails(): SentEmailRecord[] {
    return [...this.sentEmails];
  }

  clear(): void {
    this.sentEmails.length = 0;
  }
}
