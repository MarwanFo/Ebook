import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as path from 'path';
import { StorageService, StorageStreamOptions } from './storage.interface';

@Injectable()
export class S3StorageService implements StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('storage.s3.endpoint');
    const region = this.configService.get<string>('storage.s3.region') || 'auto';
    const bucket = this.configService.get<string>('storage.s3.bucket') || 'bookflow-books';
    const accessKeyId = this.configService.get<string>('storage.s3.accessKeyId');
    const secretAccessKey = this.configService.get<string>('storage.s3.secretAccessKey');

    this.bucket = bucket;

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'S3/Cloudflare R2 credentials not fully provided. Operations will fail if invoked.',
      );
    }

    this.s3Client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
      // Cloudflare R2 and most S3-compatible providers require path-style or standard endpoints
      forcePathStyle: true,
    });
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

  private detectContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.epub':
        return 'application/epub+zip';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }

  async saveFile(subDir: string, filename: string, buffer: Buffer): Promise<string> {
    if (!subDir || typeof subDir !== 'string' || !filename || typeof filename !== 'string') {
      throw new BadRequestException('Invalid subdirectory or filename');
    }

    const sanitizedFilename = path.basename(filename);
    const cleanSubDir = subDir.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '');

    const storageKey = this.sanitizeKey(`${cleanSubDir}/${sanitizedFilename}`);
    const contentType = this.detectContentType(sanitizedFilename);

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      return storageKey;
    } catch (err) {
      this.logger.error(`Failed to upload file to Cloudflare R2 (${storageKey}):`, err);
      throw new InternalServerErrorException(
        `Failed to store file in cloud storage: ${(err as Error).message}`,
      );
    }
  }

  async getFileStream(storageKey: string, options?: StorageStreamOptions): Promise<Readable> {
    const cleanKey = this.sanitizeKey(storageKey);

    let range: string | undefined;
    if (typeof options?.start === 'number' && typeof options?.end === 'number') {
      range = `bytes=${options.start}-${options.end}`;
    } else if (typeof options?.start === 'number') {
      range = `bytes=${options.start}-`;
    }

    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
          Range: range,
        }),
      );

      if (!response.Body) {
        throw new NotFoundException(`File body empty or not found: ${storageKey}`);
      }

      // If the SDK returns a web stream or node stream, cast to Readable
      if (response.Body instanceof Readable) {
        return response.Body;
      }

      // Modern AWS SDK v3 stream handling
      const bodyWithTransform = response.Body as unknown as {
        transformToWebStream?: () => Parameters<typeof Readable.fromWeb>[0];
      };
      if (typeof bodyWithTransform?.transformToWebStream === 'function') {
        return Readable.fromWeb(bodyWithTransform.transformToWebStream());
      }

      return response.Body as unknown as Readable;
    } catch (err: unknown) {
      const s3Err = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (
        s3Err.name === 'NoSuchKey' ||
        s3Err.name === 'NotFound' ||
        s3Err.$metadata?.httpStatusCode === 404
      ) {
        throw new NotFoundException(`File not found in cloud storage: ${storageKey}`);
      }
      this.logger.error(`Failed to stream file from Cloudflare R2 (${storageKey}):`, err);
      throw err;
    }
  }

  async getFileBuffer(storageKey: string): Promise<Buffer> {
    const cleanKey = this.sanitizeKey(storageKey);

    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
        }),
      );

      if (!response.Body) {
        throw new NotFoundException(`File not found in cloud storage: ${storageKey}`);
      }

      const bodyWithTransform = response.Body as {
        transformToByteArray?: () => Promise<Uint8Array>;
      };
      if (typeof bodyWithTransform.transformToByteArray === 'function') {
        const byteArray = await bodyWithTransform.transformToByteArray();
        return Buffer.from(byteArray);
      }

      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      return Buffer.concat(chunks);
    } catch (err: unknown) {
      const s3Err = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (
        s3Err.name === 'NoSuchKey' ||
        s3Err.name === 'NotFound' ||
        s3Err.$metadata?.httpStatusCode === 404
      ) {
        throw new NotFoundException(`File not found in cloud storage: ${storageKey}`);
      }
      this.logger.error(`Failed to read file buffer from Cloudflare R2 (${storageKey}):`, err);
      throw err;
    }
  }

  async deleteFile(storageKey: string): Promise<void> {
    try {
      const cleanKey = this.sanitizeKey(storageKey);
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to delete file from Cloudflare R2 (${storageKey}): ${(err as Error).message}`,
      );
    }
  }

  async fileExists(storageKey: string): Promise<boolean> {
    try {
      const cleanKey = this.sanitizeKey(storageKey);
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
        }),
      );
      return true;
    } catch (err: unknown) {
      const s3Err = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (
        s3Err.name === 'NotFound' ||
        s3Err.name === 'NoSuchKey' ||
        s3Err.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      return false;
    }
  }

  async getFileSize(storageKey: string): Promise<number> {
    try {
      const cleanKey = this.sanitizeKey(storageKey);
      const response = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: cleanKey,
        }),
      );
      return response.ContentLength ?? 0;
    } catch (err: unknown) {
      const s3Err = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (
        s3Err.name === 'NotFound' ||
        s3Err.name === 'NoSuchKey' ||
        s3Err.$metadata?.httpStatusCode === 404
      ) {
        throw new NotFoundException(`File not found in cloud storage: ${storageKey}`);
      }
      this.logger.error(`Failed to get file size from Cloudflare R2 (${storageKey}):`, err);
      throw err;
    }
  }
}
