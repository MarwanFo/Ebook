import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordHasherService } from './services/password-hasher.service';
import { CookieService } from './services/cookie.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CsrfOriginGuard } from './guards/csrf-origin.guard';
import { PrismaModule } from '../database/prisma.module';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UsersModule,
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('jwt.accessSecret') || 'default_secret_min_32_characters_here',
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiresIn') || '15m',
          issuer: configService.get<string>('jwt.issuer') || 'bookflow-api',
          audience: configService.get<string>('jwt.audience') || 'bookflow-client',
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: 60000,
          limit: 60,
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordHasherService,
    CookieService,
    JwtStrategy,
    JwtAuthGuard,
    CsrfOriginGuard,
  ],
  exports: [AuthService, JwtAuthGuard, CookieService, PasswordHasherService, JwtModule],
})
export class AuthModule {}
