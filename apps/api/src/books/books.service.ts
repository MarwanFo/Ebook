import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Book, BookFile, BookFormat as PrismaBookFormat, LocationType } from '@prisma/client';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import {
  BookDetailDto,
  BookFileSummaryDto,
  BookFormat,
  BookStatus,
  BookSummaryDto,
  BookUploadResponseDto,
  PaginatedResponse,
} from '@bookflow/shared-types';
import { PrismaService } from '../database/prisma.service';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.interface';
import { BookQueryDto } from './dto/book-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { EpubParserService } from './parsers/epub-parser.service';
import { PdfParserService } from './parsers/pdf-parser.service';
import { validateBookBuffer } from './utils/book-validator';

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);
  private readonly maxFileSizeBytes: number;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
    private readonly epubParser: EpubParserService,
    private readonly pdfParser: PdfParserService,
    private readonly configService: ConfigService,
  ) {
    const maxMb = this.configService.get<number>('storage.maxFileSizeMb') || 100;
    this.maxFileSizeBytes = maxMb * 1024 * 1024;
  }

  async upload(userId: string, file: Express.Multer.File): Promise<BookUploadResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No book file provided for upload');
    }

    // 1. Validate file content and magic bytes
    const validated = validateBookBuffer(file.buffer, this.maxFileSizeBytes);
    const originalFilename = file.originalname || `upload.${validated.format.toLowerCase()}`;
    const baseName = originalFilename.replace(/\.[^/.]+$/, '');

    // 2. Extract metadata and cover image based on format
    let extractedMetadata = {
      title: baseName,
      author: null as string | null,
      description: null as string | null,
      language: null as string | null,
      publisher: null as string | null,
      publishedAt: null as Date | null,
      isbn: null as string | null,
      pageCount: null as number | null,
    };
    let coverBuffer: Buffer | null = null;
    let coverExtension = 'jpg';

    if (validated.format === BookFormat.EPUB) {
      const epubResult = await this.epubParser.parse(file.buffer, baseName);
      extractedMetadata = {
        ...epubResult.metadata,
        pageCount: null,
      };
      if (epubResult.cover) {
        coverBuffer = epubResult.cover.buffer;
        coverExtension = epubResult.cover.extension;
      }
    } else if (validated.format === BookFormat.PDF) {
      const pdfResult = await this.pdfParser.parse(file.buffer, baseName);
      extractedMetadata = {
        ...pdfResult.metadata,
        pageCount: pdfResult.pageCount,
      };
    }

    // 3. Save physical files using StorageService
    const fileId = uuidv4();
    const bookSubDir = `books/${userId}`;
    const bookFilename = `${fileId}.${validated.format.toLowerCase()}`;
    const bookStorageKey = await this.storageService.saveFile(
      bookSubDir,
      bookFilename,
      file.buffer,
    );

    let coverStorageKey: string | null = null;
    if (coverBuffer) {
      const coverSubDir = `covers/${userId}`;
      const coverFilename = `${fileId}.${coverExtension}`;
      coverStorageKey = await this.storageService.saveFile(coverSubDir, coverFilename, coverBuffer);
    }

    // 4. Transactionally persist Book and BookFile records
    try {
      const { book, bookFile } = await this.prisma.$transaction(async (tx) => {
        const createdBook = await tx.book.create({
          data: {
            ownerId: userId,
            title: extractedMetadata.title || baseName,
            author: extractedMetadata.author,
            description: extractedMetadata.description,
            language: extractedMetadata.language,
            publisher: extractedMetadata.publisher,
            publishedAt: extractedMetadata.publishedAt,
            isbn: extractedMetadata.isbn,
            format: validated.format as unknown as PrismaBookFormat,
            coverStorageKey,
          },
        });

        const createdFile = await tx.bookFile.create({
          data: {
            bookId: createdBook.id,
            storageKey: bookStorageKey,
            originalFilename,
            mimeType: validated.mimeType,
            sizeBytes: BigInt(validated.sizeBytes),
            checksum: validated.checksum,
          },
        });

        // If pageCount was extracted for PDF, seed initial ReadingProgress total_pages
        if (extractedMetadata.pageCount && extractedMetadata.pageCount > 0) {
          await tx.readingProgress.create({
            data: {
              userId,
              bookId: createdBook.id,
              locationType: LocationType.PDF_PAGE,
              locationValue: '1',
              currentPage: 1,
              totalPages: extractedMetadata.pageCount,
              progressPercentage: 0,
            },
          });
        }

        return { book: createdBook, bookFile: createdFile };
      });

      return {
        book: this.mapToDetailDto(book, bookFile),
        extractedMetadata: {
          title: extractedMetadata.title,
          author: extractedMetadata.author,
          description: extractedMetadata.description,
          language: extractedMetadata.language,
          publisher: extractedMetadata.publisher,
          publishedAt: extractedMetadata.publishedAt?.toISOString() || null,
          isbn: extractedMetadata.isbn,
          pageCount: extractedMetadata.pageCount,
          hasCover: Boolean(coverStorageKey),
        },
      };
    } catch (err) {
      // Cleanup files if db transaction failed
      await this.storageService.deleteFile(bookStorageKey);
      if (coverStorageKey) {
        await this.storageService.deleteFile(coverStorageKey);
      }
      this.logger.error(`Failed to save book record in database: ${(err as Error).message}`);
      throw err;
    }
  }

  async findAll(userId: string, query: BookQueryDto): Promise<PaginatedResponse<BookSummaryDto>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ownerId: userId,
    };

    if (query.format) {
      where.format = query.format;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { author: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy = { [sortBy]: sortOrder };

    const [total, books] = await Promise.all([
      this.prisma.book.count({ where }),
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: books.map((b) => this.mapToSummaryDto(b)),
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    };
  }

  async findOne(userId: string, bookId: string): Promise<BookDetailDto> {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, ownerId: userId },
      include: {
        files: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID "${bookId}" not found`);
    }

    return this.mapToDetailDto(book, book.files[0]);
  }

  async update(userId: string, bookId: string, updateDto: UpdateBookDto): Promise<BookDetailDto> {
    await this.findOne(userId, bookId);

    const updated = await this.prisma.book.update({
      where: { id: bookId },
      data: {
        title: updateDto.title,
        author: updateDto.author,
        description: updateDto.description,
        language: updateDto.language,
        publisher: updateDto.publisher,
        publishedAt: updateDto.publishedAt ? new Date(updateDto.publishedAt) : undefined,
        isbn: updateDto.isbn,
        status: updateDto.status,
      },
      include: {
        files: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return this.mapToDetailDto(updated, updated.files[0]);
  }

  async delete(userId: string, bookId: string): Promise<void> {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, ownerId: userId },
      include: { files: true },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID "${bookId}" not found`);
    }

    // 1. Delete physical files from storage
    for (const file of book.files) {
      await this.storageService.deleteFile(file.storageKey);
    }
    if (book.coverStorageKey) {
      await this.storageService.deleteFile(book.coverStorageKey);
    }

    // 2. Delete database record (cascades to files, progress, bookmarks)
    await this.prisma.book.delete({
      where: { id: bookId },
    });
  }

  async streamBookFile(
    userId: string,
    bookId: string,
    rangeHeader?: string,
  ): Promise<{
    stream: Readable;
    mimeType: string;
    filename: string;
    statusCode: number;
    headers: Record<string, string>;
  }> {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, ownerId: userId },
      include: {
        files: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!book || !book.files[0]) {
      throw new NotFoundException(`File for book "${bookId}" not found`);
    }

    const file = book.files[0];
    const totalSize = Number(file.sizeBytes);

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match && match[1]) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

        if (start < totalSize && end < totalSize && start <= end) {
          const chunkSize = end - start + 1;
          const stream = await this.storageService.getFileStream(file.storageKey, {
            start,
            end,
          });

          return {
            stream,
            mimeType: file.mimeType,
            filename: file.originalFilename,
            statusCode: 206,
            headers: {
              'Content-Range': `bytes ${start}-${end}/${totalSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(chunkSize),
              'Content-Type': file.mimeType,
            },
          };
        }
      }
    }

    const stream = await this.storageService.getFileStream(file.storageKey);
    return {
      stream,
      mimeType: file.mimeType,
      filename: file.originalFilename,
      statusCode: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(totalSize),
        'Content-Type': file.mimeType,
      },
    };
  }

  async streamCover(
    userId: string,
    bookId: string,
  ): Promise<{ stream: Readable; mimeType: string }> {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, ownerId: userId },
    });

    if (!book || !book.coverStorageKey) {
      throw new NotFoundException(`Cover for book "${bookId}" not found`);
    }

    let mimeType = 'image/jpeg';
    if (book.coverStorageKey.endsWith('.png')) mimeType = 'image/png';
    else if (book.coverStorageKey.endsWith('.webp')) mimeType = 'image/webp';

    const stream = await this.storageService.getFileStream(book.coverStorageKey);
    return { stream, mimeType };
  }

  private mapToSummaryDto(book: Book): BookSummaryDto {
    return {
      id: book.id,
      ownerId: book.ownerId,
      title: book.title,
      author: book.author,
      format: book.format as unknown as BookFormat,
      status: book.status as unknown as BookStatus,
      hasCover: Boolean(book.coverStorageKey),
      createdAt: book.createdAt.toISOString(),
      updatedAt: book.updatedAt.toISOString(),
      lastOpenedAt: book.lastOpenedAt?.toISOString() || null,
    };
  }

  private mapToDetailDto(book: Book, file?: BookFile): BookDetailDto {
    const summary = this.mapToSummaryDto(book);
    let fileSummary: BookFileSummaryDto | undefined;

    if (file) {
      fileSummary = {
        id: file.id,
        originalFilename: file.originalFilename,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
        createdAt: file.createdAt.toISOString(),
      };
    }

    return {
      ...summary,
      description: book.description,
      language: book.language,
      publisher: book.publisher,
      publishedAt: book.publishedAt?.toISOString() || null,
      isbn: book.isbn,
      file: fileSummary,
    };
  }
}
