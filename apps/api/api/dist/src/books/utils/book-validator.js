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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectBookFormat = detectBookFormat;
exports.validateBookBuffer = validateBookBuffer;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const shared_types_1 = require("@bookflow/shared-types");
function detectBookFormat(buffer) {
    if (!buffer || buffer.length < 5) {
        return null;
    }
    // Check PDF signature: %PDF-
    if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
        return {
            format: shared_types_1.BookFormat.PDF,
            mimeType: 'application/pdf',
        };
    }
    // Check EPUB signature: PK\x03\x04 (ZIP container)
    if (buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04) {
        try {
            const zip = new adm_zip_1.default(buffer);
            const mimetypeEntry = zip.getEntry('mimetype');
            if (mimetypeEntry) {
                const mimetypeContent = mimetypeEntry.getData().toString('utf8').trim();
                if (mimetypeContent.startsWith('application/epub+zip')) {
                    return {
                        format: shared_types_1.BookFormat.EPUB,
                        mimeType: 'application/epub+zip',
                    };
                }
            }
        }
        catch {
            return null;
        }
    }
    return null;
}
function validateBookBuffer(buffer, maxSizeBytes = 100 * 1024 * 1024) {
    if (!buffer || buffer.length === 0) {
        throw new common_1.BadRequestException('Uploaded file is empty');
    }
    if (buffer.length > maxSizeBytes) {
        const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
        throw new common_1.BadRequestException(`File size exceeds maximum allowed limit of ${maxMb}MB`);
    }
    const detected = detectBookFormat(buffer);
    if (!detected) {
        throw new common_1.BadRequestException('Unsupported file format. Only valid EPUB (.epub) and PDF (.pdf) documents are accepted.');
    }
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    return {
        format: detected.format,
        mimeType: detected.mimeType,
        sizeBytes: buffer.length,
        checksum,
    };
}
