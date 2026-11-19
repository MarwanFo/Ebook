import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { VerifyEmailDto as IVerifyEmailDto } from '@bookflow/shared-types';

export class VerifyEmailDto implements IVerifyEmailDto {
  @ApiPropertyOptional({
    description: 'Cryptographic email verification token from URL link',
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({
    description: 'User email address (required when verifying via 6-digit OTP)',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address.' })
  email?: string;

  @ApiPropertyOptional({
    description: '6-digit numeric verification OTP',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits.' })
  otp?: string;
}
