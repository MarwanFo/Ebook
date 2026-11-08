import { LocationType } from '@bookflow/shared-types';
import { IsEnum, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateBookmarkDto {
  @IsEnum(LocationType)
  locationType: LocationType;

  @IsString()
  locationValue: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercentage: number;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  note?: string;
}
