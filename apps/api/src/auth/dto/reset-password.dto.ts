import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ResetPasswordDto as IResetPasswordDto } from '@bookflow/shared-types';

export class ResetPasswordDto implements IResetPasswordDto {
  @ApiPropertyOptional({
    example: 'd9f2e345...',
    description: 'Cryptographic password reset token from URL link',
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({
    description: 'User email address (required when resetting via 6-digit OTP)',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address.' })
  email?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: '6-digit numeric password reset OTP',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits.' })
  otp?: string;

  @ApiProperty({
    example: 'my-new-secure-passphrase-with-spaces',
    description: 'New password (minimum 15 Unicode characters, max 128 bytes)',
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required.' })
  newPassword: string;
}
