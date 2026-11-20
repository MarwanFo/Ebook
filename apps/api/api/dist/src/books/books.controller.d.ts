import { Response } from 'express';
import { BookDetailDto, BookSummaryDto, BookUploadResponseDto, PaginatedResponse } from '@bookflow/shared-types';
import { BooksService } from './books.service';
import { BookQueryDto } from './dto/book-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';
export declare class BooksController {
    private readonly booksService;
    constructor(booksService: BooksService);
    upload(userId: string, file: Express.Multer.File): Promise<BookUploadResponseDto>;
    findAll(userId: string, query: BookQueryDto): Promise<PaginatedResponse<BookSummaryDto>>;
    findOne(userId: string, id: string): Promise<BookDetailDto>;
    update(userId: string, id: string, updateDto: UpdateBookDto): Promise<BookDetailDto>;
    delete(userId: string, id: string): Promise<void>;
    streamFile(userId: string, id: string, rangeHeader: string | undefined, res: Response): Promise<void>;
    streamCover(userId: string, id: string, res: Response): Promise<void>;
}
//# sourceMappingURL=books.controller.d.ts.map