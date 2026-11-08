import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { ForgotPasswordDto as IForgotPasswordDto } from '@bookflow/shared-types';

export class ForgotPasswordDto implements IForgotPasswordDto {
  @ApiProperty({
    example: 'reader@example.com',
    description: 'Email address of the account',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;
}
