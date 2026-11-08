import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../database/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { EpubParserService } from './parsers/epub-parser.service';
import { PdfParserService } from './parsers/pdf-parser.service';

@Module({
  imports: [PrismaModule, StorageModule, ConfigModule],
  controllers: [BooksController],
  providers: [BooksService, EpubParserService, PdfParserService],
  exports: [BooksService],
})
export class BooksModule {}
