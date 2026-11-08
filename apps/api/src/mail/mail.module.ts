import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MAIL_SERVICE } from './mail.interface';
import { SmtpMailService } from './smtp-mail.service';
import { TestMailService } from './test-mail.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MAIL_SERVICE,
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('env') || process.env.NODE_ENV;
        if (nodeEnv === 'test') {
          return new TestMailService();
        }
        return new SmtpMailService(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [MAIL_SERVICE],
})
export class MailModule {}
