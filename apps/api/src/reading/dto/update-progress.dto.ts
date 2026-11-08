import { LocationType } from '@bookflow/shared-types';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsEnum(LocationType)
  locationType: LocationType;

  @IsString()
  locationValue: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  currentPage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalPages?: number;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
