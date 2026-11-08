import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import {
  BookDetailDto,
  BookSummaryDto,
  BookUploadResponseDto,
  PaginatedResponse,
} from '@bookflow/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BypassTransform } from '../common/decorators/bypass-transform.decorator';
import { BooksService } from './books.service';
import { BookQueryDto } from './dto/book-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@ApiTags('Books')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload an EPUB or PDF ebook file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<BookUploadResponseDto> {
    return this.booksService.upload(userId, file);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve paginated user library books with search and filters' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: BookQueryDto,
  ): Promise<PaginatedResponse<BookSummaryDto>> {
    return this.booksService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed metadata for a specific book' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookDetailDto> {
    return this.booksService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update book metadata or status' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateBookDto,
  ): Promise<BookDetailDto> {
    return this.booksService.update(userId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a book and its physical files' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.booksService.delete(userId, id);
  }

  @Get(':id/file')
  @BypassTransform()
  @ApiOperation({ summary: 'Stream book file with HTTP 206 Range support' })
  async streamFile(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('range') rangeHeader: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.booksService.streamBookFile(userId, id, rangeHeader);

    res.status(result.statusCode);
    Object.entries(result.headers).forEach(([key, val]) => {
      res.setHeader(key, val);
    });
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(result.filename)}"`,
    );

    result.stream.pipe(res);
  }

  @Get(':id/cover')
  @BypassTransform()
  @ApiOperation({ summary: 'Stream book cover image thumbnail' })
  async streamCover(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { stream, mimeType } = await this.booksService.streamCover(userId, id);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    stream.pipe(res);
  }
}
