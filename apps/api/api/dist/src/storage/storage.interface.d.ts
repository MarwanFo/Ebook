import { Readable } from 'stream';
export interface StorageStreamOptions {
    start?: number;
    end?: number;
}
export interface StorageService {
    saveFile(subDir: string, filename: string, buffer: Buffer): Promise<string>;
    getFileStream(storageKey: string, options?: StorageStreamOptions): Promise<Readable>;
    getFileBuffer(storageKey: string): Promise<Buffer>;
    deleteFile(storageKey: string): Promise<void>;
    fileExists(storageKey: string): Promise<boolean>;
    getFileSize(storageKey: string): Promise<number>;
}
export declare const STORAGE_SERVICE = "STORAGE_SERVICE";
//# sourceMappingURL=storage.interface.d.ts.map