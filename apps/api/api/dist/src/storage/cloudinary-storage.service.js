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
var CloudinaryStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
const path = __importStar(require("path"));
let CloudinaryStorageService = CloudinaryStorageService_1 = class CloudinaryStorageService {
    configService;
    logger = new common_1.Logger(CloudinaryStorageService_1.name);
    constructor(configService) {
        this.configService = configService;
        const cloudName = this.configService.get('storage.cloudinary.cloudName');
        const apiKey = this.configService.get('storage.cloudinary.apiKey');
        const apiSecret = this.configService.get('storage.cloudinary.apiSecret');
        const url = this.configService.get('storage.cloudinary.url');
        if (url) {
            cloudinary_1.v2.config({ cloudinary_url: url });
        }
        else if (cloudName && apiKey && apiSecret) {
            cloudinary_1.v2.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
                secure: true,
            });
        }
        else {
            this.logger.warn('Cloudinary credentials not provided. Cloudinary storage operations will fail if invoked.');
        }
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
    async saveFile(subDir, filename, buffer) {
        if (!subDir || typeof subDir !== 'string' || !filename || typeof filename !== 'string') {
            throw new common_1.BadRequestException('Invalid subdirectory or filename');
        }
        const sanitizedFilename = path.basename(filename);
        const cleanSubDir = subDir.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '');
        const storageKey = this.sanitizeKey(`${cleanSubDir}/${sanitizedFilename}`);
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                resource_type: 'raw',
                public_id: storageKey,
                overwrite: true,
                use_filename: true,
                unique_filename: false,
            }, (error, result) => {
                if (error || !result) {
                    this.logger.error(`Failed to upload file to Cloudinary (${storageKey}):`, error);
                    return reject(new common_1.InternalServerErrorException(`Failed to upload file to Cloudinary: ${error?.message || 'Unknown error'}`));
                }
                resolve(result.public_id);
            });
            const readable = new stream_1.Readable();
            readable.push(buffer);
            readable.push(null);
            readable.pipe(uploadStream);
        });
    }
    async getFileStream(storageKey, options) {
        const cleanKey = this.sanitizeKey(storageKey);
        const fileUrl = cloudinary_1.v2.url(cleanKey, {
            resource_type: 'raw',
            secure: true,
        });
        const headers = {};
        if (typeof options?.start === 'number' && typeof options?.end === 'number') {
            headers['Range'] = `bytes=${options.start}-${options.end}`;
        }
        else if (typeof options?.start === 'number') {
            headers['Range'] = `bytes=${options.start}-`;
        }
        try {
            const response = await fetch(fileUrl, { headers });
            if (response.status === 404) {
                throw new common_1.NotFoundException(`File not found in Cloudinary: ${storageKey}`);
            }
            if (!response.ok && response.status !== 206) {
                throw new common_1.InternalServerErrorException(`Failed to fetch file stream from Cloudinary: HTTP ${response.status}`);
            }
            if (!response.body) {
                throw new common_1.NotFoundException(`File body empty or not found: ${storageKey}`);
            }
            return stream_1.Readable.fromWeb(response.body);
        }
        catch (err) {
            if (err instanceof common_1.NotFoundException) {
                throw err;
            }
            this.logger.error(`Error streaming file from Cloudinary (${storageKey}):`, err);
            throw new common_1.InternalServerErrorException(`Could not stream file from Cloudinary`);
        }
    }
    async getFileBuffer(storageKey) {
        const cleanKey = this.sanitizeKey(storageKey);
        const fileUrl = cloudinary_1.v2.url(cleanKey, {
            resource_type: 'raw',
            secure: true,
        });
        try {
            const response = await fetch(fileUrl);
            if (response.status === 404) {
                throw new common_1.NotFoundException(`File not found in Cloudinary: ${storageKey}`);
            }
            if (!response.ok) {
                throw new common_1.InternalServerErrorException(`Failed to fetch file buffer from Cloudinary: HTTP ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        catch (err) {
            if (err instanceof common_1.NotFoundException) {
                throw err;
            }
            this.logger.error(`Error reading file buffer from Cloudinary (${storageKey}):`, err);
            throw new common_1.InternalServerErrorException(`Could not read file from Cloudinary`);
        }
    }
    async deleteFile(storageKey) {
        try {
            const cleanKey = this.sanitizeKey(storageKey);
            await cloudinary_1.v2.uploader.destroy(cleanKey, {
                resource_type: 'raw',
                invalidate: true,
            });
        }
        catch (err) {
            this.logger.warn(`Failed to delete file from Cloudinary (${storageKey}): ${err.message}`);
        }
    }
    async fileExists(storageKey) {
        try {
            const cleanKey = this.sanitizeKey(storageKey);
            await cloudinary_1.v2.api.resource(cleanKey, { resource_type: 'raw' });
            return true;
        }
        catch (err) {
            if (err?.error?.http_code === 404 || err?.http_code === 404) {
                return false;
            }
            return false;
        }
    }
    async getFileSize(storageKey) {
        const cleanKey = this.sanitizeKey(storageKey);
        try {
            const resource = await cloudinary_1.v2.api.resource(cleanKey, { resource_type: 'raw' });
            return resource.bytes ?? 0;
        }
        catch (err) {
            if (err?.error?.http_code === 404 || err?.http_code === 404) {
                throw new common_1.NotFoundException(`File not found in Cloudinary: ${storageKey}`);
            }
            this.logger.error(`Failed to get file size from Cloudinary (${storageKey}):`, err);
            throw err;
        }
    }
};
exports.CloudinaryStorageService = CloudinaryStorageService;
exports.CloudinaryStorageService = CloudinaryStorageService = CloudinaryStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudinaryStorageService);
