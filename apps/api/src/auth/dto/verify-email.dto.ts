import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { VerifyEmailDto as IVerifyEmailDto } from '@bookflow/shared-types';

export class VerifyEmailDto implements IVerifyEmailDto {
  @ApiProperty({
    description: 'Cryptographic email verification token',
    example: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  })
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required.' })
  token: string;
}
