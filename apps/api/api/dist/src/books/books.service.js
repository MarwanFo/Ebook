"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BooksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooksService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const shared_types_1 = require("@bookflow/shared-types");
const prisma_service_1 = require("../database/prisma.service");
const storage_interface_1 = require("../storage/storage.interface");
const epub_parser_service_1 = require("./parsers/epub-parser.service");
const pdf_parser_service_1 = require("./parsers/pdf-parser.service");
const book_validator_1 = require("./utils/book-validator");
let BooksService = BooksService_1 = class BooksService {
    prisma;
    storageService;
    epubParser;
    pdfParser;
    configService;
    logger = new common_1.Logger(BooksService_1.name);
    maxFileSizeBytes;
    constructor(prisma, storageService, epubParser, pdfParser, configService) {
        this.prisma = prisma;
        this.storageService = storageService;
        this.epubParser = epubParser;
        this.pdfParser = pdfParser;
        this.configService = configService;
        const maxMb = this.configService.get('storage.maxFileSizeMb') || 100;
        this.maxFileSizeBytes = maxMb * 1024 * 1024;
    }
    async upload(userId, file) {
        if (!file || !file.buffer) {
            throw new common_1.BadRequestException('No book file provided for upload');
        }
        // 1. Validate file content and magic bytes
        const validated = (0, book_validator_1.validateBookBuffer)(file.buffer, this.maxFileSizeBytes);
        const rawName = file.originalname || `upload.${validated.format.toLowerCase()}`;
        let decodedFilename = rawName;
        try {
            const utf8 = Buffer.from(rawName, 'latin1').toString('utf8');
            if (!utf8.includes('\ufffd')) {
                decodedFilename = utf8;
            }
        }
        catch {
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
        const baseName = sanitizedFilename
            .replace(/\.[^/.]+$/, '')
            .replace(/_+/g, ' ')
            .trim() || sanitizedFilename;
        // 2. Extract metadata and cover image based on format
        let extractedMetadata = {
            title: baseName,
            author: null,
            description: null,
            language: null,
            publisher: null,
            publishedAt: null,
            isbn: null,
            pageCount: null,
        };
        let coverBuffer = null;
        let coverExtension = 'jpg';
        if (validated.format === shared_types_1.BookFormat.EPUB) {
            const epubResult = await this.epubParser.parse(file.buffer, baseName);
            extractedMetadata = {
                ...epubResult.metadata,
                pageCount: null,
            };
            if (epubResult.cover) {
                coverBuffer = epubResult.cover.buffer;
                coverExtension = epubResult.cover.extension;
            }
        }
        else if (validated.format === shared_types_1.BookFormat.PDF) {
            const pdfResult = await this.pdfParser.parse(file.buffer, baseName);
            extractedMetadata = {
                ...pdfResult.metadata,
                pageCount: pdfResult.pageCount,
            };
        }
        // 3. Save physical files using StorageService
        const fileId = (0, uuid_1.v4)();
        const bookSubDir = `books/${userId}`;
        const bookFilename = `${fileId}.${validated.format.toLowerCase()}`;
        const bookStorageKey = await this.storageService.saveFile(bookSubDir, bookFilename, file.buffer);
        let coverStorageKey = null;
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
                        format: validated.format,
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
                            locationType: client_1.LocationType.PDF_PAGE,
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
        }
        catch (err) {
            // Cleanup files if db transaction failed
            await this.storageService.deleteFile(bookStorageKey);
            if (coverStorageKey) {
                await this.storageService.deleteFile(coverStorageKey);
            }
            this.logger.error(`Failed to save book record in database: ${err.message}`);
            throw err;
        }
    }
    async findAll(userId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(100, Math.max(1, query.limit || 20));
        const skip = (page - 1) * limit;
        const where = {
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
    async findOne(userId, bookId) {
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
            throw new common_1.NotFoundException(`Book with ID "${bookId}" not found`);
        }
        return this.mapToDetailDto(book, book.files[0]);
    }
    async update(userId, bookId, updateDto) {
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
    async delete(userId, bookId) {
        const book = await this.prisma.book.findFirst({
            where: { id: bookId, ownerId: userId },
            include: { files: true },
        });
        if (!book) {
            throw new common_1.NotFoundException(`Book with ID "${bookId}" not found`);
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
    async streamBookFile(userId, bookId, rangeHeader) {
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
            throw new common_1.NotFoundException(`File for book "${bookId}" not found`);
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
    async streamCover(userId, bookId) {
        const book = await this.prisma.book.findFirst({
            where: { id: bookId, ownerId: userId },
        });
        if (!book || !book.coverStorageKey) {
            throw new common_1.NotFoundException(`Cover for book "${bookId}" not found`);
        }
        let mimeType = 'image/jpeg';
        if (book.coverStorageKey.endsWith('.png'))
            mimeType = 'image/png';
        else if (book.coverStorageKey.endsWith('.webp'))
            mimeType = 'image/webp';
        const stream = await this.storageService.getFileStream(book.coverStorageKey);
        return { stream, mimeType };
    }
    mapToSummaryDto(book) {
        return {
            id: book.id,
            ownerId: book.ownerId,
            title: book.title,
            author: book.author,
            format: book.format,
            status: book.status,
            hasCover: Boolean(book.coverStorageKey),
            createdAt: book.createdAt.toISOString(),
            updatedAt: book.updatedAt.toISOString(),
            lastOpenedAt: book.lastOpenedAt?.toISOString() || null,
        };
    }
    mapToDetailDto(book, file) {
        const summary = this.mapToSummaryDto(book);
        let fileSummary;
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
};
exports.BooksService = BooksService;
exports.BooksService = BooksService = BooksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(storage_interface_1.STORAGE_SERVICE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object, epub_parser_service_1.EpubParserService,
        pdf_parser_service_1.PdfParserService,
        config_1.ConfigService])
], BooksService);
