import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RegisterDto as IRegisterDto } from '@bookflow/shared-types';

export class RegisterDto implements IRegisterDto {
  @ApiProperty({
    example: 'reader@example.com',
    description: 'User email address',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @ApiProperty({
    example: 'my-super-secret-passphrase-with-spaces',
    description: 'User password (minimum 15 Unicode characters, max 128 bytes)',
  })
  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;

  @ApiProperty({
    example: 'Alex Reader',
    description: 'User display name',
    required: false,
  })
  @IsString()
  @IsOptional()
  displayName?: string;
}
