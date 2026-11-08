import { BadRequestException } from '@nestjs/common';

/**
 * Common breached/trivial passwords blocklist (case-insensitive checks).
 * Includes notorious passwords, repetitive patterns, and common passphrases.
 */
const COMMON_PASSWORDS_BLOCKLIST = new Set([
  'correcthorsebatterystaple',
  'password12345678',
  'password123456789',
  '123456789012345',
  '1234567890123456',
  'qwertyuiopasdfg',
  'qwertyuiopasdfgh',
  'administrator123',
  'changeme1234567',
  'letmein12345678',
  'welcome12345678',
  'iloveyou1234567',
  'monkey123456789',
  'dragon123456789',
  'master123456789',
  'sunshine1234567',
  'princess1234567',
  'football1234567',
  'baseball1234567',
  'superman1234567',
]);

export function validatePasswordPolicy(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new BadRequestException('Password must be a valid string.');
  }

  // 1. Code point count (Unicode-aware, handles emoji, accented chars, Arabic, etc.)
  const codePointsCount = [...password].length;
  if (codePointsCount < 15) {
    throw new BadRequestException(
      `Password must contain at least 15 Unicode characters (received ${codePointsCount}).`,
    );
  }

  // 2. UTF-8 byte length limit
  const byteLength = Buffer.byteLength(password, 'utf8');
  if (byteLength > 128) {
    throw new BadRequestException(
      `Password must not exceed 128 UTF-8 bytes (received ${byteLength} bytes).`,
    );
  }

  // 3. Block common / breached passwords
  const normalized = password.toLowerCase().replace(/\s+/g, '');
  if (COMMON_PASSWORDS_BLOCKLIST.has(normalized)) {
    throw new BadRequestException(
      'This password is too common or easily guessed. Please choose a more unique passphrase.',
    );
  }
}
