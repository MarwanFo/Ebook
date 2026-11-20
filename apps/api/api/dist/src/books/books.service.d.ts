import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { BookDetailDto, BookSummaryDto, BookUploadResponseDto, PaginatedResponse } from '@bookflow/shared-types';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.interface';
import { BookQueryDto } from './dto/book-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { EpubParserService } from './parsers/epub-parser.service';
import { PdfParserService } from './parsers/pdf-parser.service';
export declare class BooksService {
    private readonly prisma;
    private readonly storageService;
    private readonly epubParser;
    private readonly pdfParser;
    private readonly configService;
    private readonly logger;
    private readonly maxFileSizeBytes;
    constructor(prisma: PrismaService, storageService: StorageService, epubParser: EpubParserService, pdfParser: PdfParserService, configService: ConfigService);
    upload(userId: string, file: Express.Multer.File): Promise<BookUploadResponseDto>;
    findAll(userId: string, query: BookQueryDto): Promise<PaginatedResponse<BookSummaryDto>>;
    findOne(userId: string, bookId: string): Promise<BookDetailDto>;
    update(userId: string, bookId: string, updateDto: UpdateBookDto): Promise<BookDetailDto>;
    delete(userId: string, bookId: string): Promise<void>;
    streamBookFile(userId: string, bookId: string, rangeHeader?: string): Promise<{
        stream: Readable;
        mimeType: string;
        filename: string;
        statusCode: number;
        headers: Record<string, string>;
    }>;
    streamCover(userId: string, bookId: string): Promise<{
        stream: Readable;
        mimeType: string;
    }>;
    private mapToSummaryDto;
    private mapToDetailDto;
}
//# sourceMappingURL=books.service.d.ts.map