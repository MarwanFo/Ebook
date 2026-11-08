import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { LoginDto as ILoginDto } from '@bookflow/shared-types';

export class LoginDto implements ILoginDto {
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
    description: 'User password',
  })
  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;
}
