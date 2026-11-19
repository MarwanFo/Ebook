import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { ResendVerificationDto as IResendVerificationDto } from '@bookflow/shared-types';

export class ResendVerificationDto implements IResendVerificationDto {
  @ApiProperty({
    description: 'Email address of unverified account',
    example: 'reader@example.com',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;
}
