import { PassThrough } from 'stream';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorageService } from './cloudinary-storage.service';

describe('CloudinaryStorageService', () => {
  let service: CloudinaryStorageService;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'storage.cloudinary.cloudName':
            return 'test-cloud';
          case 'storage.cloudinary.apiKey':
            return '1234567890';
          case 'storage.cloudinary.apiSecret':
            return 'test-secret';
          default:
            return undefined;
        }
      }),
    } as unknown as ConfigService;

    service = new CloudinaryStorageService(mockConfigService);
  });

  it('should prevent path traversal when saving files', async () => {
    await expect(service.saveFile('../secrets', 'passwd', Buffer.from('data'))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should upload file to Cloudinary and return public_id', async () => {
    const mockUploadStream = jest.fn((options, callback) => {
      const stream = new PassThrough();
      process.nextTick(() => {
        callback(null, { public_id: options.public_id });
      });
      return stream;
    });

    jest
      .spyOn(cloudinary.uploader, 'upload_stream')
      .mockImplementation(mockUploadStream as unknown as typeof cloudinary.uploader.upload_stream);

    const buffer = Buffer.from('test book content');
    const key = await service.saveFile('books/user1', 'sample.epub', buffer);

    expect(key).toBe('books/user1/sample.epub');
    expect(mockUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        public_id: 'books/user1/sample.epub',
        resource_type: 'raw',
      }),
      expect.any(Function),
    );
  });

  it('should delete file via cloudinary.uploader.destroy', async () => {
    const destroySpy = jest.spyOn(cloudinary.uploader, 'destroy').mockResolvedValueOnce({} as any);

    await service.deleteFile('books/user1/sample.epub');

    expect(destroySpy).toHaveBeenCalledWith(
      'books/user1/sample.epub',
      expect.objectContaining({ resource_type: 'raw' }),
    );
  });

  it('should return true if fileExists and false if not found', async () => {
    jest.spyOn(cloudinary.api, 'resource').mockResolvedValueOnce({ bytes: 500 } as any);
    expect(await service.fileExists('books/exists.pdf')).toBe(true);

    jest
      .spyOn(cloudinary.api, 'resource')
      .mockRejectedValueOnce({ error: { http_code: 404 } } as any);
    expect(await service.fileExists('books/missing.pdf')).toBe(false);
  });

  it('should return file size via cloudinary.api.resource', async () => {
    jest.spyOn(cloudinary.api, 'resource').mockResolvedValueOnce({ bytes: 2048 } as any);

    const size = await service.getFileSize('books/file.pdf');
    expect(size).toBe(2048);
  });

  it('should throw NotFoundException on getFileSize when file is missing', async () => {
    jest
      .spyOn(cloudinary.api, 'resource')
      .mockRejectedValueOnce({ error: { http_code: 404 } } as any);

    await expect(service.getFileSize('books/file.pdf')).rejects.toThrow(NotFoundException);
  });

  it('should fetch and stream file using fetch with range header', async () => {
    const mockFileContent = 'PDF range streamed content';
    jest.spyOn(cloudinary, 'url').mockReturnValue('https://res.cloudinary.com/test-cloud/raw/upload/books/file.pdf');

    const globalFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 206,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(mockFileContent));
          controller.close();
        },
      }),
    } as any);

    const stream = await service.getFileStream('books/file.pdf', { start: 0, end: 10 });
    expect(stream).toBeDefined();
    expect(globalFetch).toHaveBeenCalledWith(
      'https://res.cloudinary.com/test-cloud/raw/upload/books/file.pdf',
      expect.objectContaining({
        headers: { Range: 'bytes=0-10' },
      }),
    );
  });
});
