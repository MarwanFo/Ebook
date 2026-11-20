import { ConfigService } from '@nestjs/config';
import { MailService, SendEmailVerificationInput, SendPasswordChangedInput, SendPasswordResetInput, SendRegistrationAttemptAlertInput } from './mail.interface';
export declare class SmtpMailService implements MailService {
    private readonly configService;
    private readonly logger;
    private transporter;
    private readonly fromAddress;
    constructor(configService: ConfigService);
    /**
     * Dispatches password reset email.
     * STRICT AUDIT: Reset URLs and tokens are NEVER emitted to application logs.
     */
    sendPasswordReset(input: SendPasswordResetInput): Promise<void>;
    sendPasswordChanged(input: SendPasswordChangedInput): Promise<void>;
    sendEmailVerification(input: SendEmailVerificationInput): Promise<void>;
    sendRegistrationAttemptAlert(input: SendRegistrationAttemptAlertInput): Promise<void>;
    private maskEmail;
}
//# sourceMappingURL=smtp-mail.service.d.ts.map