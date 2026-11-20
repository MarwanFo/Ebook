import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { StorageService, StorageStreamOptions } from './storage.interface';
export declare class S3StorageService implements StorageService {
    private readonly configService;
    private readonly logger;
    private readonly s3Client;
    private readonly bucket;
    constructor(configService: ConfigService);
    private sanitizeKey;
    private detectContentType;
    saveFile(subDir: string, filename: string, buffer: Buffer): Promise<string>;
    getFileStream(storageKey: string, options?: StorageStreamOptions): Promise<Readable>;
    getFileBuffer(storageKey: string): Promise<Buffer>;
    deleteFile(storageKey: string): Promise<void>;
    fileExists(storageKey: string): Promise<boolean>;
    getFileSize(storageKey: string): Promise<number>;
}
//# sourceMappingURL=s3-storage.service.d.ts.map