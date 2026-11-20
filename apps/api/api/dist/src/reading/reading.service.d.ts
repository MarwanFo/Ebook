import { BookmarkDto, LibraryStatsDto, ReadingProgressDto } from '@bookflow/shared-types';
import { PrismaService } from '../database/prisma.service';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
export declare class ReadingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getProgress(userId: string, bookId: string): Promise<ReadingProgressDto | null>;
    updateProgress(userId: string, bookId: string, dto: UpdateProgressDto): Promise<ReadingProgressDto>;
    getBookmarks(userId: string, bookId: string): Promise<BookmarkDto[]>;
    createBookmark(userId: string, bookId: string, dto: CreateBookmarkDto): Promise<BookmarkDto>;
    updateBookmark(userId: string, bookmarkId: string, dto: UpdateBookmarkDto): Promise<BookmarkDto>;
    deleteBookmark(userId: string, bookmarkId: string): Promise<void>;
    getLibraryStats(userId: string): Promise<LibraryStatsDto>;
}
//# sourceMappingURL=reading.service.d.ts.map