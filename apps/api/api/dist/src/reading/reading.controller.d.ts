import { BookmarkDto, LibraryStatsDto, ReadingProgressDto } from '@bookflow/shared-types';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ReadingService } from './reading.service';
export declare class ReadingController {
    private readonly readingService;
    constructor(readingService: ReadingService);
    getLibraryStats(userId: string): Promise<LibraryStatsDto>;
    getProgress(userId: string, bookId: string): Promise<ReadingProgressDto | null>;
    updateProgress(userId: string, bookId: string, dto: UpdateProgressDto): Promise<ReadingProgressDto>;
    getBookmarks(userId: string, bookId: string): Promise<BookmarkDto[]>;
    createBookmark(userId: string, bookId: string, dto: CreateBookmarkDto): Promise<BookmarkDto>;
    updateBookmark(userId: string, bookmarkId: string, dto: UpdateBookmarkDto): Promise<BookmarkDto>;
    deleteBookmark(userId: string, bookmarkId: string): Promise<void>;
}
//# sourceMappingURL=reading.controller.d.ts.map