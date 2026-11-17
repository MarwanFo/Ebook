import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  const testStorageDir = path.resolve(__dirname, '../../test/scratch-storage');

  beforeAll(() => {
    if (!fs.existsSync(testStorageDir)) {
      fs.mkdirSync(testStorageDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'storage.localPath') return testStorageDir;
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new LocalStorageService(mockConfigService);
  });

  it('should save a file and return a normalized relative storage key', async () => {
    const content = Buffer.from('test book content', 'utf8');
    const key = await service.saveFile('books', 'sample.epub', content);

    expect(key).toBe('books/sample.epub');
    expect(await service.fileExists(key)).toBe(true);
    expect(await service.getFileSize(key)).toBe(content.length);

    const readBuffer = await service.getFileBuffer(key);
    expect(readBuffer.toString('utf8')).toBe('test book content');
  });

  it('should support getFileStream with byte ranges', async () => {
    const content = Buffer.from('0123456789ABCDEF', 'utf8');
    const key = await service.saveFile('books', 'range.txt', content);

    const stream = await service.getFileStream(key, { start: 0, end: 4 });
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const result = Buffer.concat(chunks).toString('utf8');
    expect(result).toBe('01234');
  });

  it('should throw NotFoundException when reading non-existent file', async () => {
    await expect(service.getFileBuffer('non-existent.epub')).rejects.toThrow(NotFoundException);
    await expect(service.getFileStream('non-existent.epub')).rejects.toThrow(NotFoundException);
  });

  it('should reject path traversal attempts', async () => {
    await expect(service.getFileBuffer('../../../../../etc/passwd')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.saveFile('../../../etc', 'evil.sh', Buffer.from('malicious'))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should delete existing file cleanly and not throw if file does not exist', async () => {
    const key = await service.saveFile('temp', 'del.txt', Buffer.from('to delete'));
    expect(await service.fileExists(key)).toBe(true);

    await service.deleteFile(key);
    expect(await service.fileExists(key)).toBe(false);

    // Deleting again should not throw
    await expect(service.deleteFile(key)).resolves.not.toThrow();
  });
});

