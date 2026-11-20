import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import * as path from 'path';
import { StorageService, StorageStreamOptions } from './storage.interface';

@Injectable()
export class CloudinaryStorageService implements StorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('storage.cloudinary.cloudName');
    const apiKey = this.configService.get<string>('storage.cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('storage.cloudinary.apiSecret');
    const url = this.configService.get<string>('storage.cloudinary.url');

    if (url) {
      cloudinary.config({ cloudinary_url: url });
    } else if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    } else {
      this.logger.warn(
        'Cloudinary credentials not provided. Cloudinary storage operations will fail if invoked.',
      );
    }
  }

  private sanitizeKey(storageKey: string): string {
    if (!storageKey || typeof storageKey !== 'string') {
      throw new BadRequestException('Invalid storage key');
    }

    const cleanKey = storageKey.replace(/^[/\\]+/, '').replace(/\\/g, '/');

    if (cleanKey.includes('..')) {
      this.logger.warn(`Potential path traversal attempt detected for key: ${storageKey}`);
      throw new BadRequestException('Invalid storage key: path traversal detected');
    }

    return cleanKey;
  }

  async saveFile(subDir: string, filename: string, buffer: Buffer): Promise<string> {
    if (!subDir || typeof subDir !== 'string' || !filename || typeof filename !== 'string') {
      throw new BadRequestException('Invalid subdirectory or filename');
    }

    const sanitizedFilename = path.basename(filename);
    const cleanSubDir = subDir.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '');
    const storageKey = this.sanitizeKey(`${cleanSubDir}/${sanitizedFilename}`);

    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: storageKey,
          overwrite: true,
          use_filename: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Failed to upload file to Cloudinary (${storageKey}):`, error);
            return reject(
              new InternalServerErrorException(
                `Failed to upload file to Cloudinary: ${error?.message || 'Unknown error'}`,
              ),
            );
          }
          resolve(result.public_id);
        },
      );

      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  async getFileStream(storageKey: string, options?: StorageStreamOptions): Promise<Readable> {
    const cleanKey = this.sanitizeKey(storageKey);
    const fileUrl = cloudinary.url(cleanKey, {
      resource_type: 'raw',
      secure: true,
    });

    const headers: Record<string, string> = {};
    if (typeof options?.start === 'number' && typeof options?.end === 'number') {
      headers['Range'] = `bytes=${options.start}-${options.end}`;
    } else if (typeof options?.start === 'number') {
      headers['Range'] = `bytes=${options.start}-`;
    }

    try {
      const response = await fetch(fileUrl, { headers });

      if (response.status === 404) {
        throw new NotFoundException(`File not found in Cloudinary: ${storageKey}`);
      }

      if (!response.ok && response.status !== 206) {
        throw new InternalServerErrorException(
          `Failed to fetch file stream from Cloudinary: HTTP ${response.status}`,
        );
      }

      if (!response.body) {
        throw new NotFoundException(`File body empty or not found: ${storageKey}`);
      }

      return Readable.fromWeb(
        response.body as unknown as Parameters<typeof Readable.fromWeb>[0],
      );
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(`Error streaming file from Cloudinary (${storageKey}):`, err);
      throw new InternalServerErrorException(`Could not stream file from Cloudinary`);
    }
  }

  async getFileBuffer(storageKey: string): Promise<Buffer> {
    const cleanKey = this.sanitizeKey(storageKey);
    const fileUrl = cloudinary.url(cleanKey, {
      resource_type: 'raw',
      secure: true,
    });

    try {
      const response = await fetch(fileUrl);

      if (response.status === 404) {
        throw new NotFoundException(`File not found in Cloudinary: ${storageKey}`);
      }

      if (!response.ok) {
        throw new InternalServerErrorException(
          `Failed to fetch file buffer from Cloudinary: HTTP ${response.status}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(`Error reading file buffer from Cloudinary (${storageKey}):`, err);
      throw new InternalServerErrorException(`Could not read file from Cloudinary`);
    }
  }

  async deleteFile(storageKey: string): Promise<void> {
    try {
      const cleanKey = this.sanitizeKey(storageKey);
      await cloudinary.uploader.destroy(cleanKey, {
        resource_type: 'raw',
        invalidate: true,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to delete file from Cloudinary (${storageKey}): ${(err as Error).message}`,
      );
    }
  }

  async fileExists(storageKey: string): Promise<boolean> {
    try {
      const cleanKey = this.sanitizeKey(storageKey);
      await cloudinary.api.resource(cleanKey, { resource_type: 'raw' });
      return true;
    } catch (err: unknown) {
      const errorObj = err as { error?: { http_code?: number }; http_code?: number };
      if (errorObj?.error?.http_code === 404 || errorObj?.http_code === 404) {
        return false;
      }
      return false;
    }
  }

  async getFileSize(storageKey: string): Promise<number> {
    const cleanKey = this.sanitizeKey(storageKey);

    try {
      const resource = await cloudinary.api.resource(cleanKey, { resource_type: 'raw' });
      return resource.bytes ?? 0;
    } catch (err: unknown) {
      const errorObj = err as { error?: { http_code?: number }; http_code?: number };
      if (errorObj?.error?.http_code === 404 || errorObj?.http_code === 404) {
        throw new NotFoundException(`File not found in Cloudinary: ${storageKey}`);
      }
      this.logger.error(`Failed to get file size from Cloudinary (${storageKey}):`, err);
      throw err;
    }
  }
}
