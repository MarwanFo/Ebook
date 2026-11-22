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
  ExploreBooksResponseDto,
  PaginatedResponse,
  PublicBookDto,
} from '@bookflow/shared-types';
import { PrismaService } from '../database/prisma.service';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.interface';
import { BookQueryDto } from './dto/book-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { ExploreBooksQueryDto } from './dto/explore-books-query.dto';
import { ImportPublicBookDto } from './dto/import-public-book.dto';
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
    const rawName = file.originalname || `upload.${validated.format.toLowerCase()}`;
    let decodedFilename = rawName;
    try {
      const utf8 = Buffer.from(rawName, 'latin1').toString('utf8');
      if (!utf8.includes('\ufffd')) {
        decodedFilename = utf8;
      }
    } catch {
      // Keep original if decoding fails
    }
    const sanitizedFilename = decodedFilename
      .split('')
      .filter((c) => {
        const code = c.charCodeAt(0);
        return code >= 32 && code !== 127 && (code < 128 || code > 159) && c !== '\u00AC';
      })
      .join('');
    const originalFilename = sanitizedFilename;
    const baseName =
      sanitizedFilename
        .replace(/\.[^/.]+$/, '')
        .replace(/_+/g, ' ')
        .trim() || sanitizedFilename;

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

  async explorePublicBooks(query: ExploreBooksQueryDto): Promise<ExploreBooksResponseDto> {
    const CURATED_CLASSICS: PublicBookDto[] = [
      {
        id: 1342,
        title: 'Pride and Prejudice',
        authors: ['Jane Austen'],
        subjects: ['Classic Literature', 'Romance', 'British Fiction'],
        languages: ['en'],
        coverUrl: 'https://gutenberg.pglaf.org/cache/epub/1342/pg1342.cover.medium.jpg',
        downloadUrl: 'https://gutenberg.pglaf.org/cache/epub/1342/pg1342-images.epub',
        downloadCount: 208430,
      },
      {
        id: 84,
        title: 'Frankenstein; Or, The Modern Prometheus',
        authors: ['Mary Wollstonecraft Shelley'],
        subjects: ['Gothic Fiction', 'Science Fiction', 'Horror'],
        languages: ['en'],
        coverUrl: 'https://gutenberg.pglaf.org/cache/epub/84/pg84.cover.medium.jpg',
        downloadUrl: 'https://gutenberg.pglaf.org/cache/epub/84/pg84-images.epub',
        downloadCount: 142100,
      },
      {
        id: 1661,
        title: 'The Adventures of Sherlock Holmes',
        authors: ['Arthur Conan Doyle'],
        subjects: ['Mystery', 'Detective Stories', 'Classic'],
        languages: ['en'],
        coverUrl: 'https://gutenberg.pglaf.org/cache/epub/1661/pg1661.cover.medium.jpg',
        downloadUrl: 'https://gutenberg.pglaf.org/cache/epub/1661/pg1661-images.epub',
        downloadCount: 104500,
      },
      {
        id: 345,
        title: 'Dracula',
        authors: ['Bram Stoker'],
        subjects: ['Vampires', 'Gothic Fiction', 'Horror'],
        languages: ['en'],
        coverUrl: 'https://gutenberg.pglaf.org/cache/epub/345/pg345.cover.medium.jpg',
        downloadUrl: 'https://gutenberg.pglaf.org/cache/epub/345/pg345-images.epub',
        downloadCount: 96800,
      },
      {
        id: 174,
        title: 'The Picture of Dorian Gray',
        authors: ['Oscar Wilde'],
        subjects: ['Philosophical Fiction', 'Gothic', 'Morality'],
        languages: ['en'],
        coverUrl: 'https://gutenberg.pglaf.org/cache/epub/174/pg174.cover.medium.jpg',
        downloadUrl: 'https://gutenberg.pglaf.org/cache/epub/174/pg174-images.epub',
        downloadCount: 88200,
      },
      {
        id: 2701,
        title: 'Moby Dick; Or, The Whale',
        authors: ['Herman Melville'],
        subjects: ['Adventure', 'Sea Stories', 'Classic'],
        languages: ['en'],
        coverUrl: 'https://gutenberg.pglaf.org/cache/epub/2701/pg2701.cover.medium.jpg',
        downloadUrl: 'https://gutenberg.pglaf.org/cache/epub/2701/pg2701-images.epub',
        downloadCount: 81400,
      },
      {
        id: 98,
        title: 'A Tale of Two Cities',
        authors: ['Charles Dickens'],
        subjects: ['Historical Fiction', 'French Revolution', 'Classic'],
        languages: ['en'],
        coverUrl: 'https://gutenberg.pglaf.org/cache/epub/98/pg98.cover.medium.jpg',
        downloadUrl: 'https://gutenberg.pglaf.org/cache/epub/98/pg98-images.epub',
        downloadCount: 78500,
      },
      {
        id: 11,
        title: "Alice's Adventures in Wonderland",
        authors: ['Lewis Carroll'],
        subjects: ['Fantasy', "Children's Literature", 'Nonsense Fiction'],
        languages: ['en'],
        coverUrl: 'https://gutenberg.pglaf.org/cache/epub/11/pg11.cover.medium.jpg',
        downloadUrl: 'https://gutenberg.pglaf.org/cache/epub/11/pg11-images.epub',
        downloadCount: 76300,
      },
      {
        id: 35,
        title: 'The Time Machine',
        authors: ['H. G. Wells'],
        subjects: ['Science Fiction', 'Time Travel', 'Dystopia'],
        languages: ['en'],
        coverUrl: 'https://gutenberg.pglaf.org/cache/epub/35/pg35.cover.medium.jpg',
        downloadUrl: 'https://gutenberg.pglaf.org/cache/epub/35/pg35-images.epub',
        downloadCount: 69200,
      },
      {
        id: 5200,
        title: 'Metamorphosis',
        authors: ['Franz Kafka'],
        subjects: ['Psychological Fiction', 'Absurdist', 'Classic'],
        languages: ['en'],
        coverUrl: 'https://gutenberg.pglaf.org/cache/epub/5200/pg5200.cover.medium.jpg',
        downloadUrl: 'https://gutenberg.pglaf.org/cache/epub/5200/pg5200-images.epub',
        downloadCount: 65100,
      },
      {
        id: 2591,
        title: "Grimms' Fairy Tales",
        authors: ['Jacob Grimm', 'Wilhelm Grimm'],
        subjects: ['Folklore', 'Fairy Tales', 'Mythology'],
        languages: ['en'],
        coverUrl: 'https://gutenberg.pglaf.org/cache/epub/2591/pg2591.cover.medium.jpg',
        downloadUrl: 'https://gutenberg.pglaf.org/cache/epub/2591/pg2591-images.epub',
        downloadCount: 62400,
      },
      {
        id: 74,
        title: 'The Adventures of Tom Sawyer',
        authors: ['Mark Twain'],
        subjects: ['Adventure', 'Humorous Fiction', 'American Classics'],
        languages: ['en'],
        coverUrl: 'https://gutenberg.pglaf.org/cache/epub/74/pg74.cover.medium.jpg',
        downloadUrl: 'https://gutenberg.pglaf.org/cache/epub/74/pg74-images.epub',
        downloadCount: 59300,
      },
    ];

    try {
      const params = new URLSearchParams();
      if (query.page) params.append('page', String(query.page));
      if (query.search) params.append('search', query.search);
      if (query.topic) params.append('topic', query.topic);
      params.append('languages', 'en');

      const gutendexUrl = `https://gutendex.com/books?${params.toString()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(gutendexUrl, {
        headers: {
          'User-Agent': 'BookFlow-EbookReader/1.0',
        },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!res.ok) {
        throw new Error(`Gutendex responded with ${res.status}`);
      }

      const data = (await res.json()) as {
        count?: number;
        next?: string | null;
        previous?: string | null;
        results?: Array<{
          id: number;
          title: string;
          authors?: Array<{ name?: string }>;
          subjects?: string[];
          languages?: string[];
          formats: Record<string, string>;
          download_count?: number;
        }>;
      };

      const results: PublicBookDto[] = [];
      for (const b of data.results || []) {
        // Find epub format
        const hasEpub =
          b.formats['application/epub+zip'] ||
          b.formats['application/octet-stream'] ||
          null;

        if (!hasEpub) continue;

        // Ensure downloadUrl and coverUrl point to the pglaf mirror to bypass 503 bot blocks
        const downloadUrl = `https://gutenberg.pglaf.org/cache/epub/${b.id}/pg${b.id}-images.epub`;
        const coverUrl = b.formats['image/jpeg']
          ? `https://gutenberg.pglaf.org/cache/epub/${b.id}/pg${b.id}.cover.medium.jpg`
          : null;

        const authorNames = Array.isArray(b.authors)
          ? b.authors
              .map((a) => {
                if (!a.name) return '';
                const parts = a.name.split(',').map((p) => p.trim());
                return parts.length === 2 ? `${parts[1]} ${parts[0]}` : a.name;
              })
              .filter(Boolean)
          : [];

        results.push({
          id: b.id,
          title: b.title,
          authors: authorNames,
          subjects: Array.isArray(b.subjects) ? b.subjects.slice(0, 4) : [],
          languages: b.languages || ['en'],
          coverUrl,
          downloadUrl,
          downloadCount: b.download_count || 0,
        });
      }

      let nextPage: number | null = null;
      let previousPage: number | null = null;
      if (data.next) {
        const match = data.next.match(/page=(\d+)/);
        nextPage = match ? parseInt(match[1], 10) : (query.page || 1) + 1;
      }
      if (data.previous) {
        const match = data.previous.match(/page=(\d+)/);
        previousPage = match ? parseInt(match[1], 10) : Math.max(1, (query.page || 1) - 1);
      }

      return {
        count: data.count || results.length,
        nextPage,
        previousPage,
        results: results.length > 0 ? results : CURATED_CLASSICS,
      };
    } catch (error) {
      this.logger.warn(`Gutendex fetch failed or timed out: ${(error as Error).message}. Returning curated collection.`);
      
      // Filter curated classics if search or topic is present
      let filtered = CURATED_CLASSICS;
      if (query.search) {
        const s = query.search.toLowerCase();
        filtered = filtered.filter(
          (b) =>
            b.title.toLowerCase().includes(s) ||
            b.authors.some((a) => a.toLowerCase().includes(s)) ||
            b.subjects.some((sub) => sub.toLowerCase().includes(s)),
        );
      }
      if (query.topic) {
        const t = query.topic.toLowerCase();
        filtered = filtered.filter((b) =>
          b.subjects.some((sub) => sub.toLowerCase().includes(t)),
        );
      }

      return {
        count: filtered.length,
        nextPage: null,
        previousPage: null,
        results: filtered,
      };
    }
  }

  async importPublicBook(userId: string, dto: ImportPublicBookDto): Promise<BookUploadResponseDto> {
    this.logger.log(`User ${userId} importing public book: "${dto.title}" (Gutenberg ID: ${dto.gutenbergId})`);

    // 1. Fetch the EPUB file from downloadUrl
    let fileBuffer: Buffer;
    try {
      const res = await fetch(dto.downloadUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'BookFlow-EbookReader/1.0',
        },
      });

      if (!res.ok) {
        // Fallback to non-images epub
        const fallbackUrl = `https://gutenberg.pglaf.org/cache/epub/${dto.gutenbergId}/pg${dto.gutenbergId}.epub`;
        const fallbackRes = await fetch(fallbackUrl, {
          redirect: 'follow',
          headers: { 'User-Agent': 'BookFlow-EbookReader/1.0' },
        });
        if (!fallbackRes.ok) {
          throw new BadRequestException(`Failed to download book from repository (HTTP ${res.status})`);
        }
        fileBuffer = Buffer.from(await fallbackRes.arrayBuffer());
      } else {
        fileBuffer = Buffer.from(await res.arrayBuffer());
      }
    } catch (err) {
      throw new BadRequestException(`Failed to download book file: ${(err as Error).message}`);
    }

    // 2. Validate the file buffer
    const validated = validateBookBuffer(fileBuffer, this.maxFileSizeBytes);

    // 3. Parse EPUB metadata
    const cleanTitle = dto.title.replace(/\s+/g, ' ').trim();
    const epubResult = await this.epubParser.parse(fileBuffer, cleanTitle);

    let coverBuffer: Buffer | null = null;
    let coverExtension = 'jpg';

    if (epubResult.cover) {
      coverBuffer = epubResult.cover.buffer;
      coverExtension = epubResult.cover.extension;
    } else if (dto.coverUrl) {
      try {
        const coverRes = await fetch(dto.coverUrl, {
          redirect: 'follow',
          headers: { 'User-Agent': 'BookFlow-EbookReader/1.0' },
        });
        if (coverRes.ok) {
          coverBuffer = Buffer.from(await coverRes.arrayBuffer());
          coverExtension = 'jpg';
        }
      } catch {
        // safe fallback if cover fetch fails
      }
    }

    // 4. Save physical files using StorageService
    const fileId = uuidv4();
    const bookSubDir = `books/${userId}`;
    const bookFilename = `${fileId}.${validated.format.toLowerCase()}`;
    const bookStorageKey = await this.storageService.saveFile(
      bookSubDir,
      bookFilename,
      fileBuffer,
    );

    let coverStorageKey: string | null = null;
    if (coverBuffer) {
      const coverSubDir = `covers/${userId}`;
      const coverFilename = `${fileId}.${coverExtension}`;
      coverStorageKey = await this.storageService.saveFile(coverSubDir, coverFilename, coverBuffer);
    }

    // 5. Transactionally create Book and BookFile
    const author = dto.author || epubResult.metadata.author || null;
    const description = dto.description || epubResult.metadata.description || null;

    try {
      const { book, bookFile } = await this.prisma.$transaction(async (tx) => {
        const createdBook = await tx.book.create({
          data: {
            ownerId: userId,
            title: cleanTitle,
            author,
            description,
            language: epubResult.metadata.language || 'en',
            publisher: epubResult.metadata.publisher || 'Project Gutenberg',
            publishedAt: epubResult.metadata.publishedAt,
            format: validated.format as unknown as PrismaBookFormat,
            coverStorageKey,
          },
        });

        const createdFile = await tx.bookFile.create({
          data: {
            bookId: createdBook.id,
            storageKey: bookStorageKey,
            originalFilename: `${cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.epub`,
            mimeType: validated.mimeType,
            sizeBytes: BigInt(validated.sizeBytes),
            checksum: validated.checksum,
          },
        });

        return { book: createdBook, bookFile: createdFile };
      });

      return {
        book: this.mapToDetailDto(book, bookFile),
        extractedMetadata: {
          title: cleanTitle,
          author,
          description,
          language: epubResult.metadata.language || 'en',
          publisher: 'Project Gutenberg',
          publishedAt: epubResult.metadata.publishedAt?.toISOString() || null,
          isbn: null,
          pageCount: null,
          hasCover: Boolean(coverStorageKey),
        },
      };
    } catch (err) {
      await this.storageService.deleteFile(bookStorageKey);
      if (coverStorageKey) {
        await this.storageService.deleteFile(coverStorageKey);
      }
      this.logger.error(`Failed to save imported book: ${(err as Error).message}`);
      throw err;
    }
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
