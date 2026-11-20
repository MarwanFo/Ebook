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
var PasswordHasherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordHasherService = void 0;
const common_1 = require("@nestjs/common");
const argon2 = __importStar(require("argon2"));
let PasswordHasherService = class PasswordHasherService {
    static { PasswordHasherService_1 = this; }
    /**
     * Centralized OWASP / RFC 9106 Argon2id parameters:
     * - Type: Argon2id (hybrid resistant against side-channel and GPU/ASIC attacks)
     * - Memory: 64 MB (65536 KiB)
     * - Iterations / Time cost: 3
     * - Parallelism: 4 lanes/threads
     * - Hash length: 32 bytes
     */
    options = {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
        hashLength: 32,
    };
    /**
     * Hard maximum of 128 UTF-8 bytes to prevent CPU/memory exhaustion attacks.
     */
    static MAX_PASSWORD_BYTES = 128;
    static MIN_PASSWORD_CODE_POINTS = 15;
    /**
     * Hashes a plaintext password using Argon2id.
     */
    async hash(password) {
        const byteLength = Buffer.byteLength(password, 'utf8');
        if (byteLength > PasswordHasherService_1.MAX_PASSWORD_BYTES) {
            throw new common_1.BadRequestException('Password exceeds maximum allowed limit of 128 UTF-8 bytes.');
        }
        return argon2.hash(password, this.options);
    }
    /**
     * Verifies a plaintext password against an Argon2 encoded hash.
     */
    async verify(hash, plain) {
        const byteLength = Buffer.byteLength(plain, 'utf8');
        if (byteLength > PasswordHasherService_1.MAX_PASSWORD_BYTES) {
            return false;
        }
        try {
            return await argon2.verify(hash, plain);
        }
        catch {
            return false;
        }
    }
    /**
     * Checks if a stored hash needs rehashing due to upgraded parameters.
     */
    async needsRehash(hash) {
        return argon2.needsRehash(hash, this.options);
    }
};
exports.PasswordHasherService = PasswordHasherService;
exports.PasswordHasherService = PasswordHasherService = PasswordHasherService_1 = __decorate([
    (0, common_1.Injectable)()
], PasswordHasherService);
