import { BookFormat, BookStatus } from '@bookflow/shared-types';
export declare class BookQueryDto {
    page: number;
    limit: number;
    search?: string;
    format?: BookFormat;
    status?: BookStatus;
    sortBy?: 'createdAt' | 'updatedAt' | 'lastOpenedAt' | 'title' | 'author';
    sortOrder?: 'asc' | 'desc';
}
//# sourceMappingURL=book-query.dto.d.ts.map