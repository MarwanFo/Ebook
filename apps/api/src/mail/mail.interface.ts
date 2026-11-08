export interface SendPasswordResetInput {
  email: string;
  resetUrl: string;
  expiresAt: Date;
}

export interface SendPasswordChangedInput {
  email: string;
  timestamp: Date;
}

export interface SentEmailRecord {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  timestamp: Date;
}

export interface MailService {
  sendPasswordReset(input: SendPasswordResetInput): Promise<void>;
  sendPasswordChanged(input: SendPasswordChangedInput): Promise<void>;
}

export const MAIL_SERVICE = 'MAIL_SERVICE';
