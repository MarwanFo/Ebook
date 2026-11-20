"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var S3StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_s3_1 = require("@aws-sdk/client-s3");
const stream_1 = require("stream");
const path = __importStar(require("path"));
let S3StorageService = S3StorageService_1 = class S3StorageService {
    configService;
    logger = new common_1.Logger(S3StorageService_1.name);
    s3Client;
    bucket;
    constructor(configService) {
        this.configService = configService;
        const endpoint = this.configService.get('storage.s3.endpoint');
        const region = this.configService.get('storage.s3.region') || 'auto';
        const bucket = this.configService.get('storage.s3.bucket') || 'bookflow-books';
        const accessKeyId = this.configService.get('storage.s3.accessKeyId');
        const secretAccessKey = this.configService.get('storage.s3.secretAccessKey');
        this.bucket = bucket;
        if (!accessKeyId || !secretAccessKey) {
            this.logger.warn('S3/Cloudflare R2 credentials not fully provided. Operations will fail if invoked.');
        }
        this.s3Client = new client_s3_1.S3Client({
            region,
            endpoint: endpoint || undefined,
            credentials: accessKeyId && secretAccessKey
                ? {
                    accessKeyId,
                    secretAccessKey,
                }
                : undefined,
            // Cloudflare R2 and most S3-compatible providers require path-style or standard endpoints
            forcePathStyle: true,
        });
    }
    sanitizeKey(storageKey) {
        if (!storageKey || typeof storageKey !== 'string') {
            throw new common_1.BadRequestException('Invalid storage key');
        }
        const cleanKey = storageKey.replace(/^[/\\]+/, '').replace(/\\/g, '/');
        if (cleanKey.includes('..')) {
            this.logger.warn(`Potential path traversal attempt detected for key: ${storageKey}`);
            throw new common_1.BadRequestException('Invalid storage key: path traversal detected');
        }
        return cleanKey;
    }
    detectContentType(filename) {
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
    async saveFile(subDir, filename, buffer) {
        if (!subDir || typeof subDir !== 'string' || !filename || typeof filename !== 'string') {
            throw new common_1.BadRequestException('Invalid subdirectory or filename');
        }
        const sanitizedFilename = path.basename(filename);
        const cleanSubDir = subDir.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '');
        const storageKey = this.sanitizeKey(`${cleanSubDir}/${sanitizedFilename}`);
        const contentType = this.detectContentType(sanitizedFilename);
        try {
            await this.s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucket,
                Key: storageKey,
                Body: buffer,
                ContentType: contentType,
            }));
            return storageKey;
        }
        catch (err) {
            this.logger.error(`Failed to upload file to Cloudflare R2 (${storageKey}):`, err);
            throw new common_1.InternalServerErrorException(`Failed to store file in cloud storage: ${err.message}`);
        }
    }
    async getFileStream(storageKey, options) {
        const cleanKey = this.sanitizeKey(storageKey);
        let range;
        if (typeof options?.start === 'number' && typeof options?.end === 'number') {
            range = `bytes=${options.start}-${options.end}`;
        }
        else if (typeof options?.start === 'number') {
            range = `bytes=${options.start}-`;
        }
        try {
            const response = await this.s3Client.send(new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: cleanKey,
                Range: range,
            }));
            if (!response.Body) {
                throw new common_1.NotFoundException(`File body empty or not found: ${storageKey}`);
            }
            // If the SDK returns a web stream or node stream, cast to Readable
            if (response.Body instanceof stream_1.Readable) {
                return response.Body;
            }
            // Modern AWS SDK v3 stream handling
            const bodyWithTransform = response.Body;
            if (typeof bodyWithTransform.transformToWebStream === 'function') {
                return stream_1.Readable.fromWeb(bodyWithTransform.transformToWebStream());
            }
            return response.Body;
        }
        catch (err) {
            if (err.name === 'NoSuchKey' ||
                err.name === 'NotFound' ||
                err.$metadata?.httpStatusCode === 404) {
                throw new common_1.NotFoundException(`File not found in cloud storage: ${storageKey}`);
            }
            this.logger.error(`Failed to stream file from Cloudflare R2 (${storageKey}):`, err);
            throw err;
        }
    }
    async getFileBuffer(storageKey) {
        const cleanKey = this.sanitizeKey(storageKey);
        try {
            const response = await this.s3Client.send(new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: cleanKey,
            }));
            if (!response.Body) {
                throw new common_1.NotFoundException(`File not found in cloud storage: ${storageKey}`);
            }
            const bodyWithTransform = response.Body;
            if (typeof bodyWithTransform.transformToByteArray === 'function') {
                const byteArray = await bodyWithTransform.transformToByteArray();
                return Buffer.from(byteArray);
            }
            const stream = response.Body;
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            return Buffer.concat(chunks);
        }
        catch (err) {
            if (err.name === 'NoSuchKey' ||
                err.name === 'NotFound' ||
                err.$metadata?.httpStatusCode === 404) {
                throw new common_1.NotFoundException(`File not found in cloud storage: ${storageKey}`);
            }
            this.logger.error(`Failed to read file buffer from Cloudflare R2 (${storageKey}):`, err);
            throw err;
        }
    }
    async deleteFile(storageKey) {
        try {
            const cleanKey = this.sanitizeKey(storageKey);
            await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: cleanKey,
            }));
        }
        catch (err) {
            this.logger.warn(`Failed to delete file from Cloudflare R2 (${storageKey}): ${err.message}`);
        }
    }
    async fileExists(storageKey) {
        try {
            const cleanKey = this.sanitizeKey(storageKey);
            await this.s3Client.send(new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: cleanKey,
            }));
            return true;
        }
        catch (err) {
            if (err.name === 'NotFound' ||
                err.name === 'NoSuchKey' ||
                err.$metadata?.httpStatusCode === 404) {
                return false;
            }
            return false;
        }
    }
    async getFileSize(storageKey) {
        try {
            const cleanKey = this.sanitizeKey(storageKey);
            const response = await this.s3Client.send(new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: cleanKey,
            }));
            return response.ContentLength ?? 0;
        }
        catch (err) {
            if (err.name === 'NotFound' ||
                err.name === 'NoSuchKey' ||
                err.$metadata?.httpStatusCode === 404) {
                throw new common_1.NotFoundException(`File not found in cloud storage: ${storageKey}`);
            }
            this.logger.error(`Failed to get file size from Cloudflare R2 (${storageKey}):`, err);
            throw err;
        }
    }
};
exports.S3StorageService = S3StorageService;
exports.S3StorageService = S3StorageService = S3StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], S3StorageService);
