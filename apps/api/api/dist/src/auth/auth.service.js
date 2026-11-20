"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const crypto = __importStar(require("node:crypto"));
const uuid_1 = require("uuid");
const prisma_service_1 = require("../database/prisma.service");
const users_service_1 = require("../users/users.service");
const password_hasher_service_1 = require("./services/password-hasher.service");
const mail_interface_1 = require("../mail/mail.interface");
const password_validator_1 = require("./utils/password-validator");
const disposable_email_validator_1 = require("./utils/disposable-email-validator");
const hibp_pwned_checker_1 = require("./utils/hibp-pwned-checker");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    usersService;
    passwordHasher;
    jwtService;
    configService;
    mailService;
    logger = new common_1.Logger(AuthService_1.name);
    accessSecret;
    accessExpiresIn;
    issuer;
    audience;
    refreshExpirationDays;
    webOrigin;
    turnstileSecretKey;
    // Pre-computed dummy Argon2id hash for bounded execution on non-existent accounts (anti-enumeration)
    DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$ZHVtbXlzYWx0MTIzNDU2Nw$0gW3eK3c2Jq5Q7p4R8s1T9u0V2w3X4y5Z6a7B8c9D0e';
    constructor(prisma, usersService, passwordHasher, jwtService, configService, mailService) {
        this.prisma = prisma;
        this.usersService = usersService;
        this.passwordHasher = passwordHasher;
        this.jwtService = jwtService;
        this.configService = configService;
        this.mailService = mailService;
        this.accessSecret =
            this.configService.get('jwt.accessSecret') || 'default_secret_min_32_characters_here';
        this.accessExpiresIn = this.configService.get('jwt.accessExpiresIn') || '30d';
        this.issuer = this.configService.get('jwt.issuer') || 'bookflow-api';
        this.audience = this.configService.get('jwt.audience') || 'bookflow-client';
        this.refreshExpirationDays =
            this.configService.get('cookie.refreshExpirationDays') || 365;
        this.webOrigin = this.configService.get('cors.origin') || 'http://localhost:5173';
        this.turnstileSecretKey = this.configService.get('turnstile.secretKey');
    }
    /**
     * Verifies a Cloudflare Turnstile token against Cloudflare's siteverify endpoint.
     */
    async verifyTurnstile(token, remoteIp) {
        if (!this.turnstileSecretKey) {
            return true;
        }
        if (!token) {
            return false;
        }
        try {
            const formData = new URLSearchParams();
            formData.append('secret', this.turnstileSecretKey);
            formData.append('response', token);
            if (remoteIp) {
                formData.append('remoteip', remoteIp);
            }
            const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString(),
            });
            if (!response.ok) {
                this.logger.warn(`Turnstile API returned non-OK status: ${response.status}`);
                return false;
            }
            const outcome = (await response.json());
            if (!outcome.success) {
                this.logger.warn(`Turnstile challenge failed: ${JSON.stringify(outcome['error-codes'] || [])}`);
                return false;
            }
            return true;
        }
        catch (err) {
            this.logger.error(`Error during Turnstile verification: ${err.message}`);
            return false;
        }
    }
    /**
     * Hashes a raw token string using SHA-256.
     */
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    /**
     * Generates a cryptographically secure random token (64 hex characters).
     */
    generateRawToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    /**
     * Generates a cryptographically secure 6-digit numeric OTP.
     */
    generateOtp() {
        return crypto.randomInt(100000, 1000000).toString();
    }
    /**
     * Hashes an OTP combined with the user ID using SHA-256 (prevents rainbow-table attacks).
     */
    hashOtp(userId, otp) {
        return crypto.createHash('sha256').update(`${userId}:${otp.trim()}`).digest('hex');
    }
    /**
     * Signs a short-lived JWT access token with required claims (sub, jti, iss, aud, iat, exp).
     */
    generateAccessToken(userId) {
        const payload = {
            sub: userId,
            jti: (0, uuid_1.v4)(),
        };
        return this.jwtService.sign(payload, {
            secret: this.accessSecret,
            expiresIn: this.accessExpiresIn,
            issuer: this.issuer,
            audience: this.audience,
        });
    }
    /**
     * Creates a brand-new refresh token family for a newly logged-in user.
     */
    async createRefreshToken(userId, ipAddress, userAgent) {
        const rawToken = this.generateRawToken();
        const tokenHash = this.hashToken(rawToken);
        const familyId = (0, uuid_1.v4)();
        const expiresAt = new Date(Date.now() + this.refreshExpirationDays * 24 * 60 * 60 * 1000);
        await this.prisma.refreshToken.create({
            data: {
                userId,
                familyId,
                tokenHash,
                expiresAt,
                ipAddress,
                userAgent,
            },
        });
        return rawToken;
    }
    /**
     * Registers a new user and issues initial session credentials.
     */
    async register(dto, ipAddress, userAgent) {
        // 1. Honeypot check: If the hidden bot field is filled, immediately reject
        if (dto.botField && dto.botField.trim().length > 0) {
            this.logger.warn(`Bot registration blocked by honeypot field from IP: ${ipAddress}`);
            throw new common_1.BadRequestException('Registration request verification failed.');
        }
        // 2. Reject disposable and temporary email addresses
        if ((0, disposable_email_validator_1.isDisposableEmail)(dto.email)) {
            this.logger.warn(`Registration rejected for disposable email: ${dto.email} from IP: ${ipAddress}`);
            throw new common_1.BadRequestException('Disposable and temporary email addresses are not permitted.');
        }
        // 3. Cloudflare Turnstile verification (when secret key is configured and not running in test suite)
        const isTest = this.configService.get('NODE_ENV') === 'test';
        if (this.turnstileSecretKey && !isTest) {
            if (!dto.turnstileToken) {
                throw new common_1.BadRequestException('Security challenge token is required.');
            }
            const isValid = await this.verifyTurnstile(dto.turnstileToken, ipAddress);
            if (!isValid) {
                throw new common_1.BadRequestException('Security challenge verification failed. Please try again.');
            }
        }
        // 4. HaveIBeenPwned k-Anonymity breach check
        const isBreached = await (0, hibp_pwned_checker_1.isPasswordBreached)(dto.password);
        if (isBreached) {
            this.logger.warn(`Registration blocked: passphrase found in public breaches from IP: ${ipAddress}`);
            throw new common_1.BadRequestException('This passphrase has appeared in known public data breaches. Please choose a different, more unique passphrase.');
        }
        let user;
        try {
            user = await this.usersService.create({
                email: dto.email,
                passwordPlain: dto.password,
                displayName: dto.displayName,
            });
        }
        catch (err) {
            if (err instanceof common_1.ConflictException) {
                this.logger.warn(`[SECURITY_AUDIT] Registration attempt for already-registered email: ${dto.email} from IP: ${ipAddress}`);
                // Dispatch security notification to the existing account owner (anti-takeover / anti-enumeration)
                const loginUrl = `${this.webOrigin}/login`;
                const resetUrl = `${this.webOrigin}/forgot-password`;
                this.mailService
                    .sendRegistrationAttemptAlert({
                    email: dto.email,
                    loginUrl,
                    resetUrl,
                })
                    .catch((mailErr) => this.logger.error(`Failed to send duplicate registration alert email: ${mailErr.message}`));
            }
            throw err;
        }
        const accessToken = this.generateAccessToken(user.id);
        const rawRefreshToken = await this.createRefreshToken(user.id, ipAddress, userAgent);
        // Issue cryptographic verification token and dispatch verification email
        try {
            const { rawToken, otp } = await this.createEmailVerificationToken(user.id);
            const verificationUrl = `${this.webOrigin}/verify-email?token=${rawToken}`;
            this.mailService
                .sendEmailVerification({
                email: user.email,
                verificationUrl,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                otp,
            })
                .catch((err) => this.logger.error(`Failed to send email verification: ${err.message}`));
        }
        catch (err) {
            this.logger.error(`Failed to create verification token: ${err.message}`);
        }
        return {
            session: {
                user: this.usersService.toProfileDto(user),
                accessToken,
            },
            rawRefreshToken,
        };
    }
    /**
     * Authenticates user credentials and issues session tokens.
     */
    async login(dto, ipAddress, userAgent) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            // Execute bounded dummy hash calculation to equalize timing against non-existent accounts
            await this.passwordHasher.verify(this.DUMMY_HASH, dto.password);
            throw new common_1.UnauthorizedException('Invalid email address or password.');
        }
        const isPasswordValid = await this.passwordHasher.verify(user.passwordHash, dto.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid email address or password.');
        }
        // Check if password hash needs upgrade to newer Argon2 parameters
        if (await this.passwordHasher.needsRehash(user.passwordHash)) {
            try {
                const newHash = await this.passwordHasher.hash(dto.password);
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { passwordHash: newHash },
                });
            }
            catch (err) {
                this.logger.warn(`Failed to rehash password for user ${user.id}: ${err.message}`);
            }
        }
        const accessToken = this.generateAccessToken(user.id);
        const rawRefreshToken = await this.createRefreshToken(user.id, ipAddress, userAgent);
        return {
            session: {
                user: this.usersService.toProfileDto(user),
                accessToken,
            },
            rawRefreshToken,
        };
    }
    /**
     * Atomically rotates a refresh token inside a database transaction with reuse detection
     * and a 15-second concurrency grace window to prevent false reuse alarms on near-simultaneous duplicate requests.
     */
    async rotateRefreshToken(rawToken, ipAddress, userAgent) {
        if (!rawToken || typeof rawToken !== 'string') {
            throw new common_1.UnauthorizedException('Authentication token is required.');
        }
        const tokenHash = this.hashToken(rawToken);
        const now = new Date();
        // Execute with up to 3 bounded retries in case of database serialization conflict
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            attempts++;
            try {
                const result = await this.prisma.$transaction(async (tx) => {
                    const token = await tx.refreshToken.findUnique({
                        where: { tokenHash },
                    });
                    if (!token) {
                        throw new common_1.UnauthorizedException('Invalid or expired authentication session.');
                    }
                    // 1. Check if token was revoked or already consumed
                    if (token.revokedAt !== null || token.consumedAt !== null) {
                        // Concurrency Grace Window: If consumed within the last 30s and not explicitly revoked,
                        // this is a benign concurrent request (e.g. multi-tab or network retry).
                        const isWithinGracePeriod = token.revokedAt === null &&
                            token.consumedAt !== null &&
                            now.getTime() - token.consumedAt.getTime() <= 30000;
                        if (isWithinGracePeriod) {
                            // Reject duplicate request without revoking the entire family
                            throw new common_1.UnauthorizedException('Session already refreshed. Please use the current session.');
                        }
                        // Confirmed Malicious Reuse Detected! Revoke the entire family lineage immediately.
                        await tx.refreshToken.updateMany({
                            where: { familyId: token.familyId },
                            data: {
                                revokedAt: now,
                                revocationReason: 'REUSE_DETECTED',
                            },
                        });
                        this.logger.warn(JSON.stringify({
                            event: 'REFRESH_TOKEN_REUSE_DETECTED',
                            userId: token.userId,
                            familyId: token.familyId,
                            ipAddress,
                            userAgent,
                            timestamp: now.toISOString(),
                        }));
                        throw new common_1.UnauthorizedException('Invalid or expired authentication session.');
                    }
                    // 2. Check if token is expired
                    if (token.expiresAt <= now) {
                        await tx.refreshToken.update({
                            where: { id: token.id },
                            data: {
                                revokedAt: now,
                                revocationReason: 'EXPIRED',
                            },
                        });
                        throw new common_1.UnauthorizedException('Authentication session has expired.');
                    }
                    // 3. Atomically claim the active token (affected rows must equal 1)
                    const claimed = await tx.refreshToken.updateMany({
                        where: {
                            id: token.id,
                            consumedAt: null,
                            revokedAt: null,
                            expiresAt: { gt: now },
                        },
                        data: {
                            consumedAt: now,
                        },
                    });
                    if (claimed.count !== 1) {
                        throw new common_1.UnauthorizedException('Authentication session was concurrently rotated.');
                    }
                    // 4. Generate and create child replacement token in the same family
                    const newRawToken = this.generateRawToken();
                    const newHash = this.hashToken(newRawToken);
                    const newExpiresAt = new Date(now.getTime() + this.refreshExpirationDays * 24 * 60 * 60 * 1000);
                    await tx.refreshToken.create({
                        data: {
                            userId: token.userId,
                            familyId: token.familyId,
                            tokenHash: newHash,
                            parentTokenId: token.id,
                            expiresAt: newExpiresAt,
                            ipAddress,
                            userAgent,
                        },
                    });
                    const accessToken = this.generateAccessToken(token.userId);
                    return {
                        accessToken,
                        rawRefreshToken: newRawToken,
                    };
                });
                return result;
            }
            catch (error) {
                // Retry only on PostgreSQL serialization failures (code 40001 / P2034)
                const errCode = error?.code;
                if (errCode === 'P2034' || errCode === '40001') {
                    if (attempts < maxAttempts) {
                        await new Promise((r) => setTimeout(r, 50 * attempts));
                        continue;
                    }
                }
                throw error;
            }
        }
        throw new common_1.UnauthorizedException('Unable to rotate authentication session.');
    }
    /**
     * Logs out the session by revoking the current refresh token.
     */
    async logout(rawToken) {
        if (!rawToken)
            return;
        const tokenHash = this.hashToken(rawToken);
        try {
            await this.prisma.refreshToken.update({
                where: { tokenHash },
                data: {
                    revokedAt: new Date(),
                    revocationReason: 'LOGOUT',
                },
            });
        }
        catch {
            // Non-existing token during logout is treated as successfully logged out
        }
    }
    /**
     * Changes user password, verifies current password, and revokes all active refresh sessions.
     */
    async changePassword(userId, dto) {
        (0, password_validator_1.validatePasswordPolicy)(dto.newPassword);
        const isBreached = await (0, hibp_pwned_checker_1.isPasswordBreached)(dto.newPassword);
        if (isBreached) {
            throw new common_1.BadRequestException('This passphrase has appeared in known public data breaches. Please choose a different, more unique passphrase.');
        }
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User account not found.');
        }
        const isCurrentValid = await this.passwordHasher.verify(user.passwordHash, dto.currentPassword);
        if (!isCurrentValid) {
            throw new common_1.BadRequestException('Current password is incorrect.');
        }
        const newPasswordHash = await this.passwordHasher.hash(dto.newPassword);
        const now = new Date();
        // Transactionally update password hash and revoke all refresh tokens
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { passwordHash: newPasswordHash },
            });
            await tx.refreshToken.updateMany({
                where: {
                    userId,
                    revokedAt: null,
                },
                data: {
                    revokedAt: now,
                    revocationReason: 'PASSWORD_CHANGED',
                },
            });
        });
        // Dispatched asynchronously without sensitive information
        this.mailService
            .sendPasswordChanged({
            email: user.email,
            timestamp: now,
        })
            .catch((err) => this.logger.error(`Failed to send password changed email: ${err.message}`));
        return {
            message: 'Your password has been changed successfully. Please log in again.',
        };
    }
    /**
     * Initiates forgot-password workflow with anti-enumeration response and bounded dummy hashing.
     */
    async forgotPassword(dto) {
        const genericResponse = {
            message: 'If your email address is registered with BookFlow, you will receive password reset instructions shortly.',
        };
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            // Execute bounded dummy hash to match execution latency
            await this.passwordHasher.verify(this.DUMMY_HASH, 'dummy_verification_input');
            return genericResponse;
        }
        const rawToken = this.generateRawToken();
        const tokenHash = this.hashToken(rawToken);
        const otp = this.generateOtp();
        const otpHash = this.hashOtp(user.id, otp);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute expiration
        // Invalidate existing unconsumed reset tokens for this user and store new digest
        await this.prisma.$transaction(async (tx) => {
            await tx.passwordResetToken.deleteMany({
                where: {
                    userId: user.id,
                    usedAt: null,
                },
            });
            await tx.passwordResetToken.create({
                data: {
                    userId: user.id,
                    tokenHash,
                    otpHash,
                    attempts: 0,
                    expiresAt,
                },
            });
        });
        const resetUrl = `${this.webOrigin}/reset-password?token=${rawToken}`;
        // Dispatched via MailService (Mailpit in dev, SMTP in prod)
        this.mailService
            .sendPasswordReset({
            email: user.email,
            resetUrl,
            expiresAt,
            otp,
        })
            .catch((err) => this.logger.error(`Failed to send password reset email: ${err.message}`));
        return genericResponse;
    }
    /**
     * Resets user password using single-use cryptographic token or 6-digit OTP and revokes all active sessions.
     */
    async resetPassword(dto) {
        (0, password_validator_1.validatePasswordPolicy)(dto.newPassword);
        const isBreached = await (0, hibp_pwned_checker_1.isPasswordBreached)(dto.newPassword);
        if (isBreached) {
            throw new common_1.BadRequestException('This passphrase has appeared in known public data breaches. Please choose a different, more unique passphrase.');
        }
        const now = new Date();
        let resetToken;
        if (dto.token) {
            const tokenHash = this.hashToken(dto.token.trim());
            resetToken = await this.prisma.passwordResetToken.findUnique({
                where: { tokenHash },
                include: { user: true },
            });
        }
        else if (dto.email && dto.otp) {
            const normalized = dto.email.trim().toLowerCase();
            const user = await this.usersService.findByEmail(normalized);
            if (!user) {
                throw new common_1.BadRequestException('Password reset code is invalid or has expired.');
            }
            resetToken = await this.prisma.passwordResetToken.findFirst({
                where: {
                    userId: user.id,
                    usedAt: null,
                    expiresAt: { gt: now },
                },
                orderBy: { createdAt: 'desc' },
                include: { user: true },
            });
            if (!resetToken) {
                throw new common_1.BadRequestException('No pending password reset request found for this email.');
            }
            if (resetToken.attempts >= 5) {
                throw new common_1.BadRequestException('Too many incorrect reset attempts. Please request a new password reset code.');
            }
            const expectedOtpHash = this.hashOtp(user.id, dto.otp.trim());
            if (resetToken.otpHash !== expectedOtpHash) {
                await this.prisma.passwordResetToken.update({
                    where: { id: resetToken.id },
                    data: { attempts: { increment: 1 } },
                });
                const remainingAttempts = 4 - resetToken.attempts;
                throw new common_1.BadRequestException(remainingAttempts > 0
                    ? `Invalid reset code. ${remainingAttempts} attempt(s) remaining.`
                    : 'Too many incorrect attempts. Please request a new password reset code.');
            }
        }
        else {
            throw new common_1.BadRequestException('Password reset token or 6-digit OTP code is required.');
        }
        if (!resetToken || resetToken.usedAt !== null || resetToken.expiresAt <= now) {
            throw new common_1.BadRequestException('Password reset token is invalid or has expired.');
        }
        const newPasswordHash = await this.passwordHasher.hash(dto.newPassword);
        // Atomically mark token used, update password, and revoke all sessions
        await this.prisma.$transaction(async (tx) => {
            await tx.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { usedAt: now },
            });
            await tx.user.update({
                where: { id: resetToken.userId },
                data: { passwordHash: newPasswordHash },
            });
            await tx.refreshToken.updateMany({
                where: {
                    userId: resetToken.userId,
                    revokedAt: null,
                },
                data: {
                    revokedAt: now,
                    revocationReason: 'PASSWORD_RESET',
                },
            });
        });
        this.mailService
            .sendPasswordChanged({
            email: resetToken.user.email,
            timestamp: now,
        })
            .catch((err) => this.logger.error(`Failed to send password changed email: ${err.message}`));
        return {
            message: 'Your password has been successfully reset. Please log in with your new password.',
        };
    }
    /**
     * Creates a single-use email verification token and 6-digit OTP (valid for 24 hours).
     */
    async createEmailVerificationToken(userId) {
        const rawToken = this.generateRawToken();
        const tokenHash = this.hashToken(rawToken);
        const otp = this.generateOtp();
        const otpHash = this.hashOtp(userId, otp);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.prisma.emailVerificationToken.deleteMany({
            where: {
                userId,
                usedAt: null,
            },
        });
        await this.prisma.emailVerificationToken.create({
            data: {
                userId,
                tokenHash,
                otpHash,
                attempts: 0,
                expiresAt,
            },
        });
        return { rawToken, otp };
    }
    /**
     * Verifies an email verification token or 6-digit OTP and marks the user's email as verified.
     */
    async verifyEmail(input) {
        const now = new Date();
        let record;
        if (typeof input === 'string') {
            const tokenHash = this.hashToken(input.trim());
            record = await this.prisma.emailVerificationToken.findUnique({
                where: { tokenHash },
                include: { user: true },
            });
        }
        else if (input.token) {
            const tokenHash = this.hashToken(input.token.trim());
            record = await this.prisma.emailVerificationToken.findUnique({
                where: { tokenHash },
                include: { user: true },
            });
        }
        else if (input.email && input.otp) {
            const normalized = input.email.trim().toLowerCase();
            const user = await this.usersService.findByEmail(normalized);
            if (!user) {
                throw new common_1.BadRequestException('Verification code is invalid or has expired.');
            }
            record = await this.prisma.emailVerificationToken.findFirst({
                where: {
                    userId: user.id,
                    usedAt: null,
                    expiresAt: { gt: now },
                },
                orderBy: { createdAt: 'desc' },
                include: { user: true },
            });
            if (!record) {
                throw new common_1.BadRequestException('No pending verification found for this email.');
            }
            if (record.attempts >= 5) {
                throw new common_1.BadRequestException('Too many incorrect verification attempts. Please request a new code.');
            }
            const expectedOtpHash = this.hashOtp(user.id, input.otp.trim());
            if (record.otpHash !== expectedOtpHash) {
                await this.prisma.emailVerificationToken.update({
                    where: { id: record.id },
                    data: { attempts: { increment: 1 } },
                });
                const remainingAttempts = 4 - record.attempts;
                throw new common_1.BadRequestException(remainingAttempts > 0
                    ? `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`
                    : 'Too many incorrect attempts. Please request a new verification code.');
            }
        }
        else {
            throw new common_1.BadRequestException('Verification token or 6-digit OTP code is required.');
        }
        if (!record || record.usedAt !== null || record.expiresAt <= now) {
            throw new common_1.BadRequestException('Invalid or expired verification link. Please request a new verification email.');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.emailVerificationToken.update({
                where: { id: record.id },
                data: { usedAt: now },
            });
            await tx.user.update({
                where: { id: record.userId },
                data: { isEmailVerified: true },
            });
        });
        this.logger.log(`Email successfully verified for user: ${record.userId}`);
        return {
            message: 'Email address verified successfully. Your account is fully activated.',
        };
    }
    /**
     * Resends verification email with timing-safe response (anti-enumeration).
     */
    async resendVerification(email) {
        const genericResponse = {
            message: 'If an unverified account is registered with this email, a verification link has been sent.',
        };
        if (!email || typeof email !== 'string') {
            return genericResponse;
        }
        const normalized = email.trim().toLowerCase();
        const user = await this.usersService.findByEmail(normalized);
        // If user does not exist or already verified, perform dummy hash to maintain bounded execution time
        if (!user || user.isEmailVerified) {
            await this.passwordHasher.verify(this.DUMMY_HASH, 'dummy-passphrase-timing');
            return genericResponse;
        }
        const { rawToken, otp } = await this.createEmailVerificationToken(user.id);
        const verificationUrl = `${this.webOrigin}/verify-email?token=${rawToken}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        this.mailService
            .sendEmailVerification({
            email: user.email,
            verificationUrl,
            expiresAt,
            otp,
        })
            .catch((err) => this.logger.error(`Failed to dispatch verification email: ${err.message}`));
        return genericResponse;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, common_1.Inject)(mail_interface_1.MAIL_SERVICE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        users_service_1.UsersService,
        password_hasher_service_1.PasswordHasherService,
        jwt_1.JwtService,
        config_1.ConfigService, Object])
], AuthService);
