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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPasswordBreached = isPasswordBreached;
const crypto = __importStar(require("node:crypto"));
const common_1 = require("@nestjs/common");
const logger = new common_1.Logger('HibpPwnedChecker');
/**
 * Checks if a passphrase has appeared in public data breaches
 * using HaveIBeenPwned's k-Anonymity API.
 *
 * Privacy Guarantees:
 * 1. Only the first 5 characters of the SHA-1 hash are sent to the HIBP API.
 * 2. The plaintext password NEVER leaves this server.
 * 3. Includes `Add-Padding: true` header to prevent network eavesdroppers from
 *    inferring results by packet size.
 * 4. Fails open gracefully if HIBP is offline or unreachable so registration is never broken.
 */
async function isPasswordBreached(password) {
    if (!password || typeof password !== 'string') {
        return false;
    }
    try {
        const sha1 = crypto.createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
        const prefix = sha1.substring(0, 5);
        const suffix = sha1.substring(5);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'BookFlow-Security-Audit/1.0',
                'Add-Padding': 'true',
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) {
            logger.warn(`HIBP range API returned HTTP ${response.status}. Bypassing breach check.`);
            return false;
        }
        const text = await response.text();
        const lines = text.split('\r\n');
        for (const line of lines) {
            const [hashSuffix, countStr] = line.split(':');
            if (hashSuffix && hashSuffix.trim() === suffix) {
                const count = parseInt(countStr || '0', 10);
                if (count > 0) {
                    logger.warn(`Passphrase matched breached credential database (frequency: ${count} public leaks).`);
                    return true;
                }
            }
        }
        return false;
    }
    catch (err) {
        logger.warn(`HIBP breach check bypassed: ${err.message}`);
        return false;
    }
}
