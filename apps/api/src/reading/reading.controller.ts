import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookmarkDto, LibraryStatsDto, ReadingProgressDto } from '@bookflow/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ReadingService } from './reading.service';

@ApiTags('Reading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reading')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get reading statistics and counts across entire library' })
  async getLibraryStats(@CurrentUser('id') userId: string): Promise<LibraryStatsDto> {
    return this.readingService.getLibraryStats(userId);
  }

  @Get(':bookId/progress')
  @ApiOperation({ summary: 'Get current reading progress and saved CFI/page for a book' })
  async getProgress(
    @CurrentUser('id') userId: string,
    @Param('bookId', ParseUUIDPipe) bookId: string,
  ): Promise<ReadingProgressDto | null> {
    return this.readingService.getProgress(userId, bookId);
  }

  @Put(':bookId/progress')
  @ApiOperation({ summary: 'Update reading progress, CFI/page location, and reader settings' })
  async updateProgress(
    @CurrentUser('id') userId: string,
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<ReadingProgressDto> {
    return this.readingService.updateProgress(userId, bookId, dto);
  }

  @Get(':bookId/bookmarks')
  @ApiOperation({ summary: 'Get all bookmarks and annotations for a book' })
  async getBookmarks(
    @CurrentUser('id') userId: string,
    @Param('bookId', ParseUUIDPipe) bookId: string,
  ): Promise<BookmarkDto[]> {
    return this.readingService.getBookmarks(userId, bookId);
  }

  @Post(':bookId/bookmarks')
  @ApiOperation({ summary: 'Create a new bookmark or annotation' })
  async createBookmark(
    @CurrentUser('id') userId: string,
    @Param('bookId', ParseUUIDPipe) bookId: string,
    @Body() dto: CreateBookmarkDto,
  ): Promise<BookmarkDto> {
    return this.readingService.createBookmark(userId, bookId, dto);
  }

  @Patch('bookmarks/:bookmarkId')
  @ApiOperation({ summary: 'Update title or note of an existing bookmark' })
  async updateBookmark(
    @CurrentUser('id') userId: string,
    @Param('bookmarkId', ParseUUIDPipe) bookmarkId: string,
    @Body() dto: UpdateBookmarkDto,
  ): Promise<BookmarkDto> {
    return this.readingService.updateBookmark(userId, bookmarkId, dto);
  }

  @Delete('bookmarks/:bookmarkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bookmark or annotation' })
  async deleteBookmark(
    @CurrentUser('id') userId: string,
    @Param('bookmarkId', ParseUUIDPipe) bookmarkId: string,
  ): Promise<void> {
    await this.readingService.deleteBookmark(userId, bookmarkId);
  }
}
