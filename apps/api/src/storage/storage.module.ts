import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { STORAGE_SERVICE } from './storage.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    LocalStorageService,
    S3StorageService,
    CloudinaryStorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (
        configService: ConfigService,
        localStorage: LocalStorageService,
        s3Storage: S3StorageService,
        cloudinaryStorage: CloudinaryStorageService,
      ) => {
        const driver = configService.get<string>('storage.driver')?.toLowerCase();
        if (driver === 'cloudinary') {
          return cloudinaryStorage;
        }
        if (driver === 's3' || driver === 'r2') {
          return s3Storage;
        }
        return localStorage;
      },
      inject: [ConfigService, LocalStorageService, S3StorageService, CloudinaryStorageService],
    },
  ],
  exports: [STORAGE_SERVICE, LocalStorageService, S3StorageService, CloudinaryStorageService],
})
export class StorageModule {}

