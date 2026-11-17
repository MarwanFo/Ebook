import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { S3StorageService } from './s3-storage.service';

describe('S3StorageService (Cloudflare R2)', () => {
  let service: S3StorageService;
  let mockSend: jest.Mock;

  beforeEach(() => {
    mockSend = jest.fn();
    jest.spyOn(S3Client.prototype, 'send').mockImplementation(mockSend);

    const mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'storage.s3.endpoint':
            return 'https://fake-account-id.r2.cloudflarestorage.com';
          case 'storage.s3.region':
            return 'auto';
          case 'storage.s3.bucket':
            return 'test-bucket';
          case 'storage.s3.accessKeyId':
            return 'test-access-key';
          case 'storage.s3.secretAccessKey':
            return 'test-secret-key';
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService;

    service = new S3StorageService(mockConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should save a file and return a normalized storage key', async () => {
    mockSend.mockResolvedValueOnce({});
    const buffer = Buffer.from('PDF content');

    const key = await service.saveFile('books/user123', 'document.pdf', buffer);

    expect(key).toBe('books/user123/document.pdf');
    expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    const command = mockSend.mock.calls[0][0] as PutObjectCommand;
    expect(command.input).toMatchObject({
      Bucket: 'test-bucket',
      Key: 'books/user123/document.pdf',
      ContentType: 'application/pdf',
      Body: buffer,
    });
  });

  it('should prevent path traversal when saving files', async () => {
    await expect(service.saveFile('../secrets', 'passwd', Buffer.from('data'))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should return a readable stream with range header when requested', async () => {
    const stream = Readable.from([Buffer.from('partial content')]);
    mockSend.mockResolvedValueOnce({
      Body: stream,
    });

    const resultStream = await service.getFileStream('books/doc.pdf', { start: 0, end: 100 });
    expect(resultStream).toBeDefined();

    const command = mockSend.mock.calls[0][0] as GetObjectCommand;
    expect(command.input).toMatchObject({
      Bucket: 'test-bucket',
      Key: 'books/doc.pdf',
      Range: 'bytes=0-100',
    });
  });

  it('should throw NotFoundException on getFileStream when NoSuchKey error occurs', async () => {
    const error: any = new Error('The specified key does not exist.');
    error.name = 'NoSuchKey';
    mockSend.mockRejectedValueOnce(error);

    await expect(service.getFileStream('missing.pdf')).rejects.toThrow(NotFoundException);
  });

  it('should return a buffer when getFileBuffer is called', async () => {
    const sampleBuffer = Buffer.from('Full file content');
    const stream = Readable.from([sampleBuffer]);
    mockSend.mockResolvedValueOnce({
      Body: stream,
    });

    const result = await service.getFileBuffer('books/book.epub');
    expect(result.toString()).toBe('Full file content');
  });

  it('should delete a file via DeleteObjectCommand', async () => {
    mockSend.mockResolvedValueOnce({});

    await service.deleteFile('books/deleted.epub');

    expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    const command = mockSend.mock.calls[0][0] as DeleteObjectCommand;
    expect(command.input).toMatchObject({
      Bucket: 'test-bucket',
      Key: 'books/deleted.epub',
    });
  });

  it('should return true if fileExists and false if not found', async () => {
    mockSend.mockResolvedValueOnce({});
    expect(await service.fileExists('books/exists.pdf')).toBe(true);
    expect(mockSend).toHaveBeenCalledWith(expect.any(HeadObjectCommand));

    const notFoundError: any = new Error('NotFound');
    notFoundError.name = 'NotFound';
    notFoundError.$metadata = { httpStatusCode: 404 };
    mockSend.mockRejectedValueOnce(notFoundError);
    expect(await service.fileExists('books/missing.pdf')).toBe(false);
  });

  it('should return file size via HeadObjectCommand', async () => {
    mockSend.mockResolvedValueOnce({
      ContentLength: 1024,
    });

    const size = await service.getFileSize('books/file.pdf');
    expect(size).toBe(1024);
    expect(mockSend).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
  });

  it('should throw NotFoundException on getFileSize when file is missing', async () => {
    const notFoundError: any = new Error('NoSuchKey');
    notFoundError.name = 'NoSuchKey';
    mockSend.mockRejectedValueOnce(notFoundError);

    await expect(service.getFileSize('books/file.pdf')).rejects.toThrow(NotFoundException);
  });
});
