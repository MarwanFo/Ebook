export interface SendPasswordResetInput {
  email: string;
  resetUrl: string;
  expiresAt: Date;
  otp?: string;
}

export interface SendPasswordChangedInput {
  email: string;
  timestamp: Date;
}

export interface SendEmailVerificationInput {
  email: string;
  verificationUrl: string;
  expiresAt: Date;
  otp?: string;
}

export interface SendRegistrationAttemptAlertInput {
  email: string;
  loginUrl: string;
  resetUrl: string;
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
  sendEmailVerification(input: SendEmailVerificationInput): Promise<void>;
  sendRegistrationAttemptAlert(input: SendRegistrationAttemptAlertInput): Promise<void>;
}

export const MAIL_SERVICE = 'MAIL_SERVICE';
