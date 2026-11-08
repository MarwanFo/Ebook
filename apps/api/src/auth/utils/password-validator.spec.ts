import { BadRequestException } from '@nestjs/common';
import { validatePasswordPolicy } from './password-validator';

describe('Password Validator (Unicode Code Point & Byte Limit Policy)', () => {
  it('should accept valid ASCII passphrases with 15+ code points', () => {
    expect(() => validatePasswordPolicy('my-super-secret-passphrase-2026')).not.toThrow();
  });

  it('should accept valid accented Unicode passphrases', () => {
    expect(() => validatePasswordPolicy('très_sécurisé_mot_de_passe_15')).not.toThrow();
  });

  it('should accept valid Arabic Unicode passphrases', () => {
    expect(() => validatePasswordPolicy('كلمة_المرور_السرية_جدا_للغاية')).not.toThrow();
  });

  it('should accept 15 emoji code points within 128 UTF-8 bytes', () => {
    // 15 emojis * 4 bytes each = 60 bytes <= 128 bytes
    const emojiPassword = '🌟✨🎉🚀🔥💎🛡️⭐🌈📚🎯🦄🌻⚡🍎';
    expect(() => validatePasswordPolicy(emojiPassword)).not.toThrow();
  });

  it('should reject passwords with fewer than 15 Unicode code points', () => {
    expect(() => validatePasswordPolicy('short-pass')).toThrow(BadRequestException);
    expect(() => validatePasswordPolicy('12345678901234')).toThrow(BadRequestException);
  });

  it('should reject passwords exceeding 128 UTF-8 bytes', () => {
    // 33 emojis * 4 bytes = 132 bytes > 128 bytes
    const oversizedEmoji = '🌟'.repeat(33);
    expect(() => validatePasswordPolicy(oversizedEmoji)).toThrow(BadRequestException);

    const oversizedAscii = 'a'.repeat(129);
    expect(() => validatePasswordPolicy(oversizedAscii)).toThrow(BadRequestException);
  });

  it('should reject common and easily guessed passwords from blocklist', () => {
    expect(() => validatePasswordPolicy('correcthorsebatterystaple')).toThrow(BadRequestException);
    expect(() => validatePasswordPolicy('password12345678')).toThrow(BadRequestException);
    expect(() => validatePasswordPolicy('123456789012345')).toThrow(BadRequestException);
  });
});
