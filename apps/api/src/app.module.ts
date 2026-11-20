import { MiddlewareConsumer, Module, NestModule, RequestMethod, Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validate } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { StorageModule } from './storage/storage.module';
import { BooksModule } from './books/books.module';
import { ReadingModule } from './reading/reading.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Injectable()
export class SafeThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const headers = req.headers as Record<string, string> | undefined;
    const socket = req.socket as { remoteAddress?: string } | undefined;
    return (
      headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      headers?.['x-real-ip'] ||
      (req.ip as string) ||
      socket?.remoteAddress ||
      '127.0.0.1'
    );
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    MailModule,
    AuthModule,
    StorageModule,
    BooksModule,
    ReadingModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SafeThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
