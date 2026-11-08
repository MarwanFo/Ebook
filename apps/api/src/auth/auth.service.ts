import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { PasswordHasherService } from './services/password-hasher.service';
import { MAIL_SERVICE, MailService } from '../mail/mail.interface';
import { validatePasswordPolicy } from './utils/password-validator';
import {
  AuthSessionDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  MessageResponseDto,
  RegisterDto,
  ResetPasswordDto,
} from '@bookflow/shared-types';

export interface TokenRotationResult {
  accessToken: string;
  rawRefreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly refreshExpirationDays: number;
  private readonly webOrigin: string;

  // Pre-computed dummy Argon2id hash for bounded execution on non-existent accounts (anti-enumeration)
  private readonly DUMMY_HASH =
    '$argon2id$v=19$m=65536,t=3,p=4$ZHVtbXlzYWx0MTIzNDU2Nw$0gW3eK3c2Jq5Q7p4R8s1T9u0V2w3X4y5Z6a7B8c9D0e';

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(MAIL_SERVICE) private readonly mailService: MailService,
  ) {
    this.accessSecret =
      this.configService.get<string>('jwt.accessSecret') || 'default_secret_min_32_characters_here';
    this.accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn') || '15m';
    this.issuer = this.configService.get<string>('jwt.issuer') || 'bookflow-api';
    this.audience = this.configService.get<string>('jwt.audience') || 'bookflow-client';
    this.refreshExpirationDays =
      this.configService.get<number>('cookie.refreshExpirationDays') || 7;
    this.webOrigin = this.configService.get<string>('cors.origin') || 'http://localhost:5173';
  }

  /**
   * Hashes a raw token string using SHA-256.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a cryptographically secure random token (64 hex characters).
   */
  generateRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Signs a short-lived JWT access token with required claims (sub, jti, iss, aud, iat, exp).
   */
  generateAccessToken(userId: string): string {
    const payload = {
      sub: userId,
      jti: uuidv4(),
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
  async createRefreshToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
    const familyId = uuidv4();
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
  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ session: AuthSessionDto; rawRefreshToken: string }> {
    const user = await this.usersService.create({
      email: dto.email,
      passwordPlain: dto.password,
      displayName: dto.displayName,
    });

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
   * Authenticates user credentials and issues session tokens.
   */
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ session: AuthSessionDto; rawRefreshToken: string }> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      // Execute bounded dummy hash calculation to equalize timing against non-existent accounts
      await this.passwordHasher.verify(this.DUMMY_HASH, dto.password);
      throw new UnauthorizedException('Invalid email address or password.');
    }

    const isPasswordValid = await this.passwordHasher.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email address or password.');
    }

    // Check if password hash needs upgrade to newer Argon2 parameters
    if (await this.passwordHasher.needsRehash(user.passwordHash)) {
      try {
        const newHash = await this.passwordHasher.hash(dto.password);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash },
        });
      } catch (err) {
        this.logger.warn(
          `Failed to rehash password for user ${user.id}: ${(err as Error).message}`,
        );
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
  async rotateRefreshToken(
    rawToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenRotationResult> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new UnauthorizedException('Authentication token is required.');
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
            throw new UnauthorizedException('Invalid or expired authentication session.');
          }

          // 1. Check if token was revoked or already consumed
          if (token.revokedAt !== null || token.consumedAt !== null) {
            // Concurrency Grace Window: If consumed within the last 15s and not explicitly revoked,
            // this is a benign concurrent request (e.g. multi-tab or network retry).
            const isWithinGracePeriod =
              token.revokedAt === null &&
              token.consumedAt !== null &&
              now.getTime() - token.consumedAt.getTime() <= 15000;

            if (isWithinGracePeriod) {
              // Reject duplicate request without revoking the entire family
              throw new UnauthorizedException(
                'Session already refreshed. Please use the current session.',
              );
            }

            // Confirmed Malicious Reuse Detected! Revoke the entire family lineage immediately.
            await tx.refreshToken.updateMany({
              where: { familyId: token.familyId },
              data: {
                revokedAt: now,
                revocationReason: 'REUSE_DETECTED',
              },
            });

            this.logger.warn(
              JSON.stringify({
                event: 'REFRESH_TOKEN_REUSE_DETECTED',
                userId: token.userId,
                familyId: token.familyId,
                ipAddress,
                userAgent,
                timestamp: now.toISOString(),
              }),
            );

            throw new UnauthorizedException('Invalid or expired authentication session.');
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
            throw new UnauthorizedException('Authentication session has expired.');
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
            throw new UnauthorizedException('Authentication session was concurrently rotated.');
          }

          // 4. Generate and create child replacement token in the same family
          const newRawToken = this.generateRawToken();
          const newHash = this.hashToken(newRawToken);
          const newExpiresAt = new Date(
            now.getTime() + this.refreshExpirationDays * 24 * 60 * 60 * 1000,
          );

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
      } catch (error) {
        // Retry only on PostgreSQL serialization failures (code 40001 / P2034)
        const errCode = (error as { code?: string })?.code;
        if (errCode === 'P2034' || errCode === '40001') {
          if (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 50 * attempts));
            continue;
          }
        }
        throw error;
      }
    }

    throw new UnauthorizedException('Unable to rotate authentication session.');
  }

  /**
   * Logs out the session by revoking the current refresh token.
   */
  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) return;

    const tokenHash = this.hashToken(rawToken);
    try {
      await this.prisma.refreshToken.update({
        where: { tokenHash },
        data: {
          revokedAt: new Date(),
          revocationReason: 'LOGOUT',
        },
      });
    } catch {
      // Non-existing token during logout is treated as successfully logged out
    }
  }

  /**
   * Changes user password, verifies current password, and revokes all active refresh sessions.
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<MessageResponseDto> {
    validatePasswordPolicy(dto.newPassword);

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User account not found.');
    }

    const isCurrentValid = await this.passwordHasher.verify(user.passwordHash, dto.currentPassword);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect.');
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
  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    const genericResponse: MessageResponseDto = {
      message:
        'If your email address is registered with BookFlow, you will receive password reset instructions shortly.',
    };

    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      // Execute bounded dummy hash to match execution latency
      await this.passwordHasher.verify(this.DUMMY_HASH, 'dummy_verification_input');
      return genericResponse;
    }

    const rawToken = this.generateRawToken();
    const tokenHash = this.hashToken(rawToken);
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
      })
      .catch((err) => this.logger.error(`Failed to send password reset email: ${err.message}`));

    return genericResponse;
  }

  /**
   * Resets user password using single-use cryptographic token and revokes all active sessions.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
    validatePasswordPolicy(dto.newPassword);

    const tokenHash = this.hashToken(dto.token);
    const now = new Date();

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt !== null || resetToken.expiresAt <= now) {
      throw new BadRequestException('Password reset token is invalid or has expired.');
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
}
