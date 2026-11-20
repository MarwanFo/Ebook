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
var LocalStorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let LocalStorageService = LocalStorageService_1 = class LocalStorageService {
    configService;
    logger = new common_1.Logger(LocalStorageService_1.name);
    basePath;
    constructor(configService) {
        this.configService = configService;
        const rawPath = this.configService.get('storage.localPath') || './storage';
        this.basePath = path.resolve(process.cwd(), rawPath);
        this.ensureDirectoryExists(this.basePath);
    }
    ensureDirectoryExists(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
    getAbsolutePath(storageKey) {
        if (!storageKey || typeof storageKey !== 'string') {
            throw new common_1.BadRequestException('Invalid storage key');
        }
        const cleanKey = storageKey.replace(/^[/\\]+/, '');
        const resolved = path.resolve(this.basePath, cleanKey);
        // Strict boundary enforcement: resolved path must reside within basePath
        if (!resolved.startsWith(this.basePath + path.sep) && resolved !== this.basePath) {
            this.logger.warn(`Potential path traversal attempt detected for key: ${storageKey}`);
            throw new common_1.BadRequestException('Invalid storage key: path traversal detected');
        }
        return resolved;
    }
    async saveFile(subDir, filename, buffer) {
        if (!subDir || typeof subDir !== 'string' || !filename || typeof filename !== 'string') {
            throw new common_1.BadRequestException('Invalid subdirectory or filename');
        }
        const sanitizedFilename = path.basename(filename);
        const cleanSubDir = subDir.replace(/^[/\\]+/, '');
        const targetDir = path.resolve(this.basePath, cleanSubDir);
        // Strict boundary enforcement: targetDir must reside within basePath
        if (!targetDir.startsWith(this.basePath + path.sep) && targetDir !== this.basePath) {
            this.logger.warn(`Potential path traversal attempt detected for directory: ${subDir}`);
            throw new common_1.BadRequestException('Invalid subdirectory: path traversal detected');
        }
        this.ensureDirectoryExists(targetDir);
        const fullPath = path.resolve(targetDir, sanitizedFilename);
        const storageKey = path.relative(this.basePath, fullPath).replace(/\\/g, '/');
        await fs.promises.writeFile(fullPath, buffer);
        return storageKey;
    }
    async getFileStream(storageKey, options) {
        const fullPath = this.getAbsolutePath(storageKey);
        if (!fs.existsSync(fullPath)) {
            throw new common_1.NotFoundException(`File not found: ${storageKey}`);
        }
        const streamOptions = {};
        if (typeof options?.start === 'number') {
            streamOptions.start = options.start;
        }
        if (typeof options?.end === 'number') {
            streamOptions.end = options.end;
        }
        return fs.createReadStream(fullPath, streamOptions);
    }
    async getFileBuffer(storageKey) {
        const fullPath = this.getAbsolutePath(storageKey);
        if (!fs.existsSync(fullPath)) {
            throw new common_1.NotFoundException(`File not found: ${storageKey}`);
        }
        return fs.promises.readFile(fullPath);
    }
    async deleteFile(storageKey) {
        try {
            const fullPath = this.getAbsolutePath(storageKey);
            if (fs.existsSync(fullPath)) {
                await fs.promises.unlink(fullPath);
            }
        }
        catch (err) {
            this.logger.warn(`Failed to delete storage file ${storageKey}: ${err.message}`);
        }
    }
    async fileExists(storageKey) {
        try {
            const fullPath = this.getAbsolutePath(storageKey);
            return fs.existsSync(fullPath);
        }
        catch {
            return false;
        }
    }
    async getFileSize(storageKey) {
        const fullPath = this.getAbsolutePath(storageKey);
        if (!fs.existsSync(fullPath)) {
            throw new common_1.NotFoundException(`File not found: ${storageKey}`);
        }
        const stat = await fs.promises.stat(fullPath);
        return stat.size;
    }
};
exports.LocalStorageService = LocalStorageService;
exports.LocalStorageService = LocalStorageService = LocalStorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LocalStorageService);
