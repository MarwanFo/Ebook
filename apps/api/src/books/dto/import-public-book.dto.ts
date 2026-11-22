import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class ImportPublicBookDto {
  @Type(() => Number)
  @IsInt()
  gutenbergId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @IsUrl()
  downloadUrl: string;
}
