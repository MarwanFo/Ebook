import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateBookmarkDto {
  @IsOptional()
  @IsString()
  @Length(1, 200)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  note?: string;
}
