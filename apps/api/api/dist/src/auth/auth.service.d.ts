import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { PasswordHasherService } from './services/password-hasher.service';
import { MailService } from '../mail/mail.interface';
import { AuthSessionDto, ChangePasswordDto, ForgotPasswordDto, LoginDto, MessageResponseDto, RegisterDto, ResetPasswordDto, VerifyEmailDto } from '@bookflow/shared-types';
export interface TokenRotationResult {
    accessToken: string;
    rawRefreshToken: string;
}
export declare class AuthService {
    private readonly prisma;
    private readonly usersService;
    private readonly passwordHasher;
    private readonly jwtService;
    private readonly configService;
    private readonly mailService;
    private readonly logger;
    private readonly accessSecret;
    private readonly accessExpiresIn;
    private readonly issuer;
    private readonly audience;
    private readonly refreshExpirationDays;
    private readonly webOrigin;
    private readonly turnstileSecretKey?;
    private readonly DUMMY_HASH;
    constructor(prisma: PrismaService, usersService: UsersService, passwordHasher: PasswordHasherService, jwtService: JwtService, configService: ConfigService, mailService: MailService);
    /**
     * Verifies a Cloudflare Turnstile token against Cloudflare's siteverify endpoint.
     */
    verifyTurnstile(token?: string, remoteIp?: string): Promise<boolean>;
    /**
     * Hashes a raw token string using SHA-256.
     */
    hashToken(token: string): string;
    /**
     * Generates a cryptographically secure random token (64 hex characters).
     */
    generateRawToken(): string;
    /**
     * Generates a cryptographically secure 6-digit numeric OTP.
     */
    generateOtp(): string;
    /**
     * Hashes an OTP combined with the user ID using SHA-256 (prevents rainbow-table attacks).
     */
    hashOtp(userId: string, otp: string): string;
    /**
     * Signs a short-lived JWT access token with required claims (sub, jti, iss, aud, iat, exp).
     */
    generateAccessToken(userId: string): string;
    /**
     * Creates a brand-new refresh token family for a newly logged-in user.
     */
    createRefreshToken(userId: string, ipAddress?: string, userAgent?: string): Promise<string>;
    /**
     * Registers a new user and issues initial session credentials.
     */
    register(dto: RegisterDto, ipAddress?: string, userAgent?: string): Promise<{
        session: AuthSessionDto;
        rawRefreshToken: string;
    }>;
    /**
     * Authenticates user credentials and issues session tokens.
     */
    login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<{
        session: AuthSessionDto;
        rawRefreshToken: string;
    }>;
    /**
     * Atomically rotates a refresh token inside a database transaction with reuse detection
     * and a 15-second concurrency grace window to prevent false reuse alarms on near-simultaneous duplicate requests.
     */
    rotateRefreshToken(rawToken: string, ipAddress?: string, userAgent?: string): Promise<TokenRotationResult>;
    /**
     * Logs out the session by revoking the current refresh token.
     */
    logout(rawToken?: string): Promise<void>;
    /**
     * Changes user password, verifies current password, and revokes all active refresh sessions.
     */
    changePassword(userId: string, dto: ChangePasswordDto): Promise<MessageResponseDto>;
    /**
     * Initiates forgot-password workflow with anti-enumeration response and bounded dummy hashing.
     */
    forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponseDto>;
    /**
     * Resets user password using single-use cryptographic token or 6-digit OTP and revokes all active sessions.
     */
    resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto>;
    /**
     * Creates a single-use email verification token and 6-digit OTP (valid for 24 hours).
     */
    createEmailVerificationToken(userId: string): Promise<{
        rawToken: string;
        otp: string;
    }>;
    /**
     * Verifies an email verification token or 6-digit OTP and marks the user's email as verified.
     */
    verifyEmail(input: string | VerifyEmailDto): Promise<MessageResponseDto>;
    /**
     * Resends verification email with timing-safe response (anti-enumeration).
     */
    resendVerification(email: string): Promise<MessageResponseDto>;
}
//# sourceMappingURL=auth.service.d.ts.map