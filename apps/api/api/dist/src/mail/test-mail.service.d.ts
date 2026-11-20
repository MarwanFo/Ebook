import { MailService, SendEmailVerificationInput, SendPasswordChangedInput, SendPasswordResetInput, SendRegistrationAttemptAlertInput, SentEmailRecord } from './mail.interface';
export declare class TestMailService implements MailService {
    private readonly sentEmails;
    sendPasswordReset(input: SendPasswordResetInput): Promise<void>;
    sendPasswordChanged(input: SendPasswordChangedInput): Promise<void>;
    sendEmailVerification(input: SendEmailVerificationInput): Promise<void>;
    sendRegistrationAttemptAlert(input: SendRegistrationAttemptAlertInput): Promise<void>;
    getSentEmails(): SentEmailRecord[];
    clear(): void;
}
//# sourceMappingURL=test-mail.service.d.ts.map