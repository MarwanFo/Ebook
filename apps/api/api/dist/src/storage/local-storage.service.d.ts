import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';
import { StorageService, StorageStreamOptions } from './storage.interface';
export declare class LocalStorageService implements StorageService {
    private readonly configService;
    private readonly logger;
    private readonly basePath;
    constructor(configService: ConfigService);
    private ensureDirectoryExists;
    private getAbsolutePath;
    saveFile(subDir: string, filename: string, buffer: Buffer): Promise<string>;
    getFileStream(storageKey: string, options?: StorageStreamOptions): Promise<Readable>;
    getFileBuffer(storageKey: string): Promise<Buffer>;
    deleteFile(storageKey: string): Promise<void>;
    fileExists(storageKey: string): Promise<boolean>;
    getFileSize(storageKey: string): Promise<number>;
}
//# sourceMappingURL=local-storage.service.d.ts.map