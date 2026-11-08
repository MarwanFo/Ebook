import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PasswordHasherService } from '../auth/services/password-hasher.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UsersService, PasswordHasherService],
  exports: [UsersService, PasswordHasherService],
})
export class UsersModule {}
