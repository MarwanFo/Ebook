import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { UserProfileDto } from '@bookflow/shared-types';

export interface JwtPayload {
  sub: string;
  jti: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const accessSecret = configService.get<string>('jwt.accessSecret');
    if (!accessSecret) {
      throw new Error('JWT_ACCESS_SECRET is required but not configured.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
      algorithms: ['HS256'],
      issuer: configService.get<string>('jwt.issuer') || 'bookflow-api',
      audience: configService.get<string>('jwt.audience') || 'bookflow-client',
      clockTolerance: 5,
    });
  }

  async validate(payload: JwtPayload): Promise<UserProfileDto> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid access token payload.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User account no longer exists.');
    }

    return this.usersService.toProfileDto(user);
  }
}
