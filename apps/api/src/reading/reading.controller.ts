import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReadingProgressDto } from '@bookflow/shared-types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ReadingService } from './reading.service';

@ApiTags('Reading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reading')
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

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
}
