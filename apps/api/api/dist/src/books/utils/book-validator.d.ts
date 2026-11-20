import { BookFormat } from '@bookflow/shared-types';
export interface ValidatedBookFile {
    format: BookFormat;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
}
export declare function detectBookFormat(buffer: Buffer): {
    format: BookFormat;
    mimeType: string;
} | null;
export declare function validateBookBuffer(buffer: Buffer, maxSizeBytes?: number): ValidatedBookFile;
//# sourceMappingURL=book-validator.d.ts.map