import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { ChangePasswordDto as IChangePasswordDto } from '@bookflow/shared-types';

export class ChangePasswordDto implements IChangePasswordDto {
  @ApiProperty({
    example: 'my-old-secret-passphrase-here',
    description: 'Current password for verification',
  })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required.' })
  currentPassword: string;

  @ApiProperty({
    example: 'my-brand-new-secret-passphrase-with-spaces',
    description: 'New password (minimum 15 Unicode characters, max 128 bytes)',
  })
  @IsString()
  @IsNotEmpty({ message: 'New password is required.' })
  newPassword: string;
}
