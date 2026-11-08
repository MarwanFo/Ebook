import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { ResetPasswordDto as IResetPasswordDto } from '@bookflow/shared-types';

export class ResetPasswordDto implements IResetPasswordDto {
  @ApiProperty({
    example: 'd9f2e345...',
    description: 'Cryptographic password reset token',
  })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required.' })
  token: string;

  @ApiProperty({
    example: 'my-new-secure-passphrase-with-spaces',
    description: 'New password (minimum 15 Unicode characters, max 128 bytes)',
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required.' })
  newPassword: string;
}
