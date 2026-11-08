import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { ReadingController } from './reading.controller';
import { ReadingService } from './reading.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReadingController],
  providers: [ReadingService],
  exports: [ReadingService],
})
export class ReadingModule {}
