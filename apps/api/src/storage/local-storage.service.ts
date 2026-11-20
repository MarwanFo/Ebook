import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { StorageService, StorageStreamOptions } from './storage.interface';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    const defaultPath = process.env.VERCEL ? '/tmp/storage' : './storage';
    const rawPath = this.configService.get<string>('storage.localPath') || defaultPath;
    this.basePath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
    this.ensureDirectoryExists(this.basePath);
  }

  private ensureDirectoryExists(dir: string): void {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      this.logger.warn(`Could not create storage directory ${dir}: ${(err as Error).message}`);
    }
  }

  private getAbsolutePath(storageKey: string): string {
    if (!storageKey || typeof storageKey !== 'string') {
      throw new BadRequestException('Invalid storage key');
    }

    const cleanKey = storageKey.replace(/^[/\\]+/, '');
    const resolved = path.resolve(this.basePath, cleanKey);

    // Strict boundary enforcement: resolved path must reside within basePath
    if (!resolved.startsWith(this.basePath + path.sep) && resolved !== this.basePath) {
      this.logger.warn(`Potential path traversal attempt detected for key: ${storageKey}`);
      throw new BadRequestException('Invalid storage key: path traversal detected');
    }

    return resolved;
  }

  async saveFile(subDir: string, filename: string, buffer: Buffer): Promise<string> {
    if (!subDir || typeof subDir !== 'string' || !filename || typeof filename !== 'string') {
      throw new BadRequestException('Invalid subdirectory or filename');
    }

    const sanitizedFilename = path.basename(filename);
    const cleanSubDir = subDir.replace(/^[/\\]+/, '');
    const targetDir = path.resolve(this.basePath, cleanSubDir);

    // Strict boundary enforcement: targetDir must reside within basePath
    if (!targetDir.startsWith(this.basePath + path.sep) && targetDir !== this.basePath) {
      this.logger.warn(`Potential path traversal attempt detected for directory: ${subDir}`);
      throw new BadRequestException('Invalid subdirectory: path traversal detected');
    }

    this.ensureDirectoryExists(targetDir);

    const fullPath = path.resolve(targetDir, sanitizedFilename);
    const storageKey = path.relative(this.basePath, fullPath).replace(/\\/g, '/');

    await fs.promises.writeFile(fullPath, buffer);
    return storageKey;
  }

  async getFileStream(storageKey: string, options?: StorageStreamOptions): Promise<Readable> {
    const fullPath = this.getAbsolutePath(storageKey);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`File not found: ${storageKey}`);
    }

    const streamOptions: { start?: number; end?: number } = {};
    if (typeof options?.start === 'number') {
      streamOptions.start = options.start;
    }
    if (typeof options?.end === 'number') {
      streamOptions.end = options.end;
    }

    return fs.createReadStream(fullPath, streamOptions);
  }

  async getFileBuffer(storageKey: string): Promise<Buffer> {
    const fullPath = this.getAbsolutePath(storageKey);

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`File not found: ${storageKey}`);
    }

    return fs.promises.readFile(fullPath);
  }

  async deleteFile(storageKey: string): Promise<void> {
    try {
      const fullPath = this.getAbsolutePath(storageKey);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch (err) {
      this.logger.warn(`Failed to delete storage file ${storageKey}: ${(err as Error).message}`);
    }
  }

  async fileExists(storageKey: string): Promise<boolean> {
    try {
      const fullPath = this.getAbsolutePath(storageKey);
      return fs.existsSync(fullPath);
    } catch {
      return false;
    }
  }

  async getFileSize(storageKey: string): Promise<number> {
    const fullPath = this.getAbsolutePath(storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(`File not found: ${storageKey}`);
    }
    const stat = await fs.promises.stat(fullPath);
    return stat.size;
  }
}

