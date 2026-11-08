import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@bookflow/shared-types';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { UsersService } from '../../users/users.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.accessSecret') return 'test_jwt_secret_with_minimum_length_32_characters';
        if (key === 'jwt.issuer') return 'bookflow-api';
        if (key === 'jwt.audience') return 'bookflow-client';
        return null;
      }),
    } as any;

    usersService = {
      findById: jest.fn(),
      toProfileDto: jest.fn(),
    } as any;

    strategy = new JwtStrategy(configService, usersService);
  });

  it('should throw an error if jwt.accessSecret is missing in configuration', () => {
    const brokenConfig = {
      get: jest.fn(() => null),
    } as any;

    expect(() => new JwtStrategy(brokenConfig, usersService)).toThrow(
      'JWT_ACCESS_SECRET is required but not configured.',
    );
  });

  it('should validate and return user profile for a valid payload', async () => {
    const mockUser = {
      id: 'user-uuid-1234',
      email: 'reader@example.com',
      displayName: 'Avid Reader',
      avatarUrl: null,
      passwordHash: 'hash',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockProfile = {
      id: 'user-uuid-1234',
      email: 'reader@example.com',
      displayName: 'Avid Reader',
      avatarUrl: null,
      role: UserRole.USER,
      createdAt: mockUser.createdAt.toISOString(),
      updatedAt: mockUser.updatedAt.toISOString(),
    };

    usersService.findById.mockResolvedValue(mockUser);
    usersService.toProfileDto.mockReturnValue(mockProfile);

    const payload: JwtPayload = {
      sub: 'user-uuid-1234',
      jti: 'jti-token-id-1',
      iss: 'bookflow-api',
      aud: 'bookflow-client',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    };

    const result = await strategy.validate(payload);

    expect(usersService.findById).toHaveBeenCalledWith('user-uuid-1234');
    expect(usersService.toProfileDto).toHaveBeenCalledWith(mockUser);
    expect(result).toEqual(mockProfile);
  });

  it('should throw UnauthorizedException if payload is missing sub', async () => {
    await expect(strategy.validate({} as any)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is not found in database', async () => {
    usersService.findById.mockResolvedValue(null);

    const payload: JwtPayload = {
      sub: 'deleted-user-uuid',
      jti: 'jti-token-id-2',
      iss: 'bookflow-api',
      aud: 'bookflow-client',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });
});
