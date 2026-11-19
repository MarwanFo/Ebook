import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@bookflow/shared-types';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { PasswordHasherService } from './services/password-hasher.service';
import { MailService } from '../mail/mail.interface';
import { isPasswordBreached } from './utils/hibp-pwned-checker';

jest.mock('./utils/hibp-pwned-checker', () => ({
  isPasswordBreached: jest.fn().mockResolvedValue(false),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let usersService: jest.Mocked<UsersService>;
  let passwordHasher: jest.Mocked<PasswordHasherService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let mailService: jest.Mocked<MailService>;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'reader@example.com',
    displayName: 'Bookworm',
    avatarUrl: null,
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$somehash',
    role: UserRole.USER,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProfile = {
    id: 'user-uuid-1',
    email: 'reader@example.com',
    displayName: 'Bookworm',
    avatarUrl: null,
    role: UserRole.USER,
    isEmailVerified: true,
    createdAt: mockUser.createdAt.toISOString(),
    updatedAt: mockUser.updatedAt.toISOString(),
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      emailVerificationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
    };

    usersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      toProfileDto: jest.fn(),
    } as any;

    passwordHasher = {
      hash: jest.fn(),
      verify: jest.fn(),
      needsRehash: jest.fn(),
    } as any;

    jwtService = {
      sign: jest.fn().mockReturnValue('mock.access.token'),
    } as any;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.accessSecret') return 'test_jwt_secret_with_minimum_length_32_characters';
        if (key === 'jwt.accessExpiresIn') return '15m';
        if (key === 'jwt.issuer') return 'bookflow-api';
        if (key === 'jwt.audience') return 'bookflow-client';
        if (key === 'cookie.refreshExpirationDays') return 7;
        if (key === 'cors.origin') return 'http://localhost:5173';
        return null;
      }),
    } as any;

    mailService = {
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
      sendPasswordChanged: jest.fn().mockResolvedValue(undefined),
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendRegistrationAttemptAlert: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      prisma as PrismaService,
      usersService,
      passwordHasher,
      jwtService,
      configService,
      mailService,
    );
  });

  describe('register', () => {
    it('should register a new user, generate access token and return refresh token', async () => {
      usersService.create.mockResolvedValue(mockUser);
      usersService.toProfileDto.mockReturnValue(mockProfile);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await service.register(
        {
          email: 'reader@example.com',
          password: 'super-secure-passphrase-12345',
          displayName: 'Bookworm',
        },
        '127.0.0.1',
        'Jest-Test',
      );

      expect(usersService.create).toHaveBeenCalledWith({
        email: 'reader@example.com',
        passwordPlain: 'super-secure-passphrase-12345',
        displayName: 'Bookworm',
      });
      expect(jwtService.sign).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
      expect(result.session.user).toEqual(mockProfile);
      expect(result.session.accessToken).toBe('mock.access.token');
      expect(typeof result.rawRefreshToken).toBe('string');
      expect(result.rawRefreshToken.length).toBe(64);
    });

    it('should reject registration if honeypot botField is populated', async () => {
      await expect(
        service.register(
          {
            email: 'bot@example.com',
            password: 'super-secure-passphrase-12345',
            botField: 'I am a spam bot',
          },
          '127.0.0.1',
          'Bot-Agent',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should reject registration if email is a disposable email address', async () => {
      await expect(
        service.register(
          {
            email: 'burner@mailinator.com',
            password: 'super-secure-passphrase-12345',
          },
          '127.0.0.1',
          'Jest-Test',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should reject registration if password has been compromised in public breaches', async () => {
      (isPasswordBreached as jest.Mock).mockResolvedValueOnce(true);

      await expect(
        service.register(
          {
            email: 'breached@example.com',
            password: 'breached-password-found-in-pwned-db',
          },
          '127.0.0.1',
          'Jest-Test',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should create email verification token and dispatch email on register', async () => {
      usersService.create.mockResolvedValue(mockUser);
      usersService.toProfileDto.mockReturnValue(mockProfile);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
      prisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.emailVerificationToken.create.mockResolvedValue({ id: 'evt-1' });

      await service.register(
        {
          email: 'reader@example.com',
          password: 'super-secure-passphrase-12345',
        },
        '127.0.0.1',
        'Jest-Test',
      );

      expect(prisma.emailVerificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUser.id,
            tokenHash: expect.any(String),
          }),
        }),
      );
      expect(mailService.sendEmailVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockUser.email,
          verificationUrl: expect.stringContaining('/verify-email?token='),
        }),
      );
    });

    it('should dispatch security alert email and reject when email is already registered', async () => {
      usersService.create.mockRejectedValueOnce(
        new ConflictException('An account with this email address already exists.'),
      );

      await expect(
        service.register(
          {
            email: 'existing@example.com',
            password: 'super-secure-passphrase-12345',
          },
          '127.0.0.1',
          'Jest-Test',
        ),
      ).rejects.toThrow(ConflictException);

      expect(mailService.sendRegistrationAttemptAlert).toHaveBeenCalledWith({
        email: 'existing@example.com',
        loginUrl: 'http://localhost:5173/login',
        resetUrl: 'http://localhost:5173/forgot-password',
      });
    });
  });

  describe('login', () => {
    it('should login valid user, issue access token and refresh token', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      passwordHasher.verify.mockResolvedValue(true);
      passwordHasher.needsRehash.mockResolvedValue(false);
      usersService.toProfileDto.mockReturnValue(mockProfile);
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

      const result = await service.login(
        { email: 'reader@example.com', password: 'super-secure-passphrase-12345' },
        '127.0.0.1',
        'Jest-Test',
      );

      expect(usersService.findByEmail).toHaveBeenCalledWith('reader@example.com');
      expect(passwordHasher.verify).toHaveBeenCalledWith(
        mockUser.passwordHash,
        'super-secure-passphrase-12345',
      );
      expect(result.session.accessToken).toBe('mock.access.token');
      expect(result.session.user).toEqual(mockProfile);
      expect(result.rawRefreshToken).toBeDefined();
    });

    it('should reject non-existent user with uniform error and run dummy hash', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      passwordHasher.verify.mockResolvedValue(false);

      await expect(
        service.login({ email: 'ghost@example.com', password: 'anypassword12345' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(passwordHasher.verify).toHaveBeenCalled();
    });

    it('should reject incorrect password with uniform error', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      passwordHasher.verify.mockResolvedValue(false);

      await expect(
        service.login({ email: 'reader@example.com', password: 'wrongpassword12345' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('rotateRefreshToken', () => {
    const rawToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const futureDate = new Date(Date.now() + 86400000);

    it('should atomically consume old token and create replacement token in same family', async () => {
      const activeToken = {
        id: 'token-old-id',
        familyId: 'family-1',
        userId: 'user-uuid-1',
        revokedAt: null,
        consumedAt: null,
        expiresAt: futureDate,
      };

      prisma.refreshToken.findUnique.mockResolvedValue(activeToken);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.refreshToken.create.mockResolvedValue({ id: 'token-new-id' });

      const result = await service.rotateRefreshToken(rawToken, '127.0.0.1', 'Jest-Test');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'token-old-id',
          consumedAt: null,
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        data: {
          consumedAt: expect.any(Date),
        },
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-uuid-1',
          familyId: 'family-1',
          parentTokenId: 'token-old-id',
        }),
      });
      expect(result.accessToken).toBe('mock.access.token');
      expect(result.rawRefreshToken).toBeDefined();
    });

    it('should detect token reuse and revoke the entire token family', async () => {
      const reusedToken = {
        id: 'token-stolen-id',
        familyId: 'family-victim-1',
        userId: 'user-uuid-1',
        revokedAt: null,
        consumedAt: new Date(Date.now() - 60000), // Consumed 1 minute ago (outside 15s grace window)
        expiresAt: futureDate,
      };

      prisma.refreshToken.findUnique.mockResolvedValue(reusedToken);

      await expect(service.rotateRefreshToken(rawToken, '127.0.0.1', 'Jest-Test')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: 'family-victim-1' },
        data: {
          revokedAt: expect.any(Date),
          revocationReason: 'REUSE_DETECTED',
        },
      });
    });

    it('should tolerate concurrent duplicate refresh within 15s grace window without family revocation', async () => {
      const recentlyConsumedToken = {
        id: 'token-concurrent-id',
        familyId: 'family-grace-1',
        userId: 'user-uuid-1',
        revokedAt: null,
        consumedAt: new Date(Date.now() - 3000), // 3 seconds ago (within 15s grace period)
        expiresAt: futureDate,
      };

      prisma.refreshToken.findUnique.mockResolvedValue(recentlyConsumedToken);

      await expect(service.rotateRefreshToken(rawToken, '127.0.0.1', 'Jest-Test')).rejects.toThrow(
        UnauthorizedException,
      );

      // Verify updateMany with REUSE_DETECTED was NOT called
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ revocationReason: 'REUSE_DETECTED' }),
        }),
      );
    });

    it('should reject expired refresh token and mark it revoked', async () => {
      const expiredToken = {
        id: 'token-expired-id',
        familyId: 'family-expired-1',
        userId: 'user-uuid-1',
        revokedAt: null,
        consumedAt: null,
        expiresAt: new Date(Date.now() - 1000), // Already expired
      };

      prisma.refreshToken.findUnique.mockResolvedValue(expiredToken);

      await expect(service.rotateRefreshToken(rawToken, '127.0.0.1', 'Jest-Test')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token-expired-id' },
        data: {
          revokedAt: expect.any(Date),
          revocationReason: 'EXPIRED',
        },
      });
    });
  });

  describe('logout', () => {
    it('should revoke active refresh token on logout', async () => {
      const rawToken = 'sampletoken0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
      await service.logout(rawToken);

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
        data: {
          revokedAt: expect.any(Date),
          revocationReason: 'LOGOUT',
        },
      });
    });
  });

  describe('changePassword', () => {
    it('should verify current password, update hash, and revoke all active refresh tokens', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      passwordHasher.verify.mockResolvedValue(true);
      passwordHasher.hash.mockResolvedValue('$argon2id$v=19$m=65536,t=3,p=4$newhash');

      const result = await service.changePassword('user-uuid-1', {
        currentPassword: 'current-valid-passphrase-123',
        newPassword: 'brand-new-passphrase-with-15-chars',
      });

      expect(passwordHasher.verify).toHaveBeenCalledWith(
        mockUser.passwordHash,
        'current-valid-passphrase-123',
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: { passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$newhash' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-uuid-1',
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
          revocationReason: 'PASSWORD_CHANGED',
        },
      });
      expect(mailService.sendPasswordChanged).toHaveBeenCalledWith({
        email: 'reader@example.com',
        timestamp: expect.any(Date),
      });
      expect(result.message).toContain('password has been changed successfully');
    });

    it('should reject change password when current password does not match', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      passwordHasher.verify.mockResolvedValue(false);

      await expect(
        service.changePassword('user-uuid-1', {
          currentPassword: 'wrong-current-password',
          newPassword: 'brand-new-passphrase-with-15-chars',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    it('should return generic message for non-existent user and run dummy hash', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      passwordHasher.verify.mockResolvedValue(false);

      const result = await service.forgotPassword({ email: 'unknown@example.com' });

      expect(passwordHasher.verify).toHaveBeenCalled();
      expect(result.message).toContain('If your email address is registered');
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should generate reset token and dispatch email for existing user', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetToken.create.mockResolvedValue({ id: 'prt-1' });

      const result = await service.forgotPassword({ email: 'reader@example.com' });

      expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, usedAt: null },
      });
      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
      expect(mailService.sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'reader@example.com',
          resetUrl: expect.stringContaining('/reset-password?token='),
        }),
      );
      expect(result.message).toContain('If your email address is registered');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token and revoke sessions', async () => {
      const resetRecord = {
        id: 'prt-1',
        userId: 'user-uuid-1',
        tokenHash: 'token-hash',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: mockUser,
      };

      prisma.passwordResetToken.findUnique.mockResolvedValue(resetRecord);
      passwordHasher.hash.mockResolvedValue('$argon2id$newpasswordhash');
      prisma.passwordResetToken.update.mockResolvedValue({ id: 'prt-1' });
      prisma.user.update.mockResolvedValue({ id: 'user-uuid-1' });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'new-valid-passphrase-15chars',
      });

      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prt-1' },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: { passwordHash: '$argon2id$newpasswordhash' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1', revokedAt: null },
        data: { revokedAt: expect.any(Date), revocationReason: 'PASSWORD_RESET' },
      });
      expect(result.message).toContain('successfully reset');
    });

    it('should reset password with valid email and 6-digit OTP', async () => {
      const otp = '123456';
      const otpHash = (service as any).hashOtp(mockUser.id, otp);
      const resetRecord = {
        id: 'prt-2',
        userId: mockUser.id,
        otpHash,
        attempts: 0,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: mockUser,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      prisma.passwordResetToken.findFirst.mockResolvedValue(resetRecord);
      passwordHasher.hash.mockResolvedValue('$argon2id$newpasswordhash');
      prisma.passwordResetToken.update.mockResolvedValue({ id: 'prt-2' });
      prisma.user.update.mockResolvedValue({ id: mockUser.id });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.resetPassword({
        email: mockUser.email,
        otp,
        newPassword: 'new-valid-passphrase-15chars',
      });

      expect(result.message).toContain('successfully reset');
    });

    it('should increment attempts and reject when OTP is incorrect', async () => {
      const correctOtp = '123456';
      const wrongOtp = '654321';
      const otpHash = (service as any).hashOtp(mockUser.id, correctOtp);
      const resetRecord = {
        id: 'prt-3',
        userId: mockUser.id,
        otpHash,
        attempts: 0,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: mockUser,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      prisma.passwordResetToken.findFirst.mockResolvedValue(resetRecord);
      prisma.passwordResetToken.update.mockResolvedValue({ id: 'prt-3' });

      await expect(
        service.resetPassword({
          email: mockUser.email,
          otp: wrongOtp,
          newPassword: 'new-valid-passphrase-15chars',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'prt-3' },
        data: { attempts: { increment: 1 } },
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const mockRecord = {
        id: 'evt-1',
        userId: 'user-uuid-1',
        tokenHash: 'some-hash',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: mockUser,
      };

      prisma.emailVerificationToken.findUnique.mockResolvedValue(mockRecord);
      prisma.emailVerificationToken.update.mockResolvedValue({ id: 'evt-1' });
      prisma.user.update.mockResolvedValue({ id: 'user-uuid-1', isEmailVerified: true });

      const result = await service.verifyEmail('valid-raw-token');

      expect(prisma.emailVerificationToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt-1' },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid-1' },
          data: { isEmailVerified: true },
        }),
      );
      expect(result.message).toContain('verified successfully');
    });

    it('should verify email with valid 6-digit OTP and email', async () => {
      const otp = '654321';
      const otpHash = (service as any).hashOtp(mockUser.id, otp);
      const mockRecord = {
        id: 'evt-otp-1',
        userId: mockUser.id,
        otpHash,
        attempts: 0,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: mockUser,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      prisma.emailVerificationToken.findFirst.mockResolvedValue(mockRecord);
      prisma.emailVerificationToken.update.mockResolvedValue({ id: 'evt-otp-1' });
      prisma.user.update.mockResolvedValue({ id: mockUser.id, isEmailVerified: true });

      const result = await service.verifyEmail({
        email: mockUser.email,
        otp,
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: { isEmailVerified: true },
        }),
      );
      expect(result.message).toContain('verified successfully');
    });

    it('should increment attempts and reject invalid OTP for email verification', async () => {
      const correctOtp = '654321';
      const wrongOtp = '111111';
      const otpHash = (service as any).hashOtp(mockUser.id, correctOtp);
      const mockRecord = {
        id: 'evt-otp-2',
        userId: mockUser.id,
        otpHash,
        attempts: 1,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: mockUser,
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      prisma.emailVerificationToken.findFirst.mockResolvedValue(mockRecord);
      prisma.emailVerificationToken.update.mockResolvedValue({ id: 'evt-otp-2' });

      await expect(
        service.verifyEmail({
          email: mockUser.email,
          otp: wrongOtp,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.emailVerificationToken.update).toHaveBeenCalledWith({
        where: { id: 'evt-otp-2' },
        data: { attempts: { increment: 1 } },
      });
    });

    it('should reject verification if token is invalid or expired', async () => {
      prisma.emailVerificationToken.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerification', () => {
    it('should dispatch verification email if unverified account exists', async () => {
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      usersService.findByEmail.mockResolvedValue(unverifiedUser as any);
      prisma.emailVerificationToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.emailVerificationToken.create.mockResolvedValue({ id: 'evt-2' });

      const result = await service.resendVerification('reader@example.com');

      expect(mailService.sendEmailVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'reader@example.com',
          verificationUrl: expect.stringContaining('/verify-email?token='),
        }),
      );
      expect(result.message).toContain('verification link has been sent');
    });

    it('should return generic response without sending email if user is already verified', async () => {
      const verifiedUser = { ...mockUser, isEmailVerified: true };
      usersService.findByEmail.mockResolvedValue(verifiedUser as any);
      passwordHasher.verify.mockResolvedValue(false);

      const result = await service.resendVerification('reader@example.com');

      expect(mailService.sendEmailVerification).not.toHaveBeenCalled();
      expect(result.message).toContain('verification link has been sent');
    });
  });
});
