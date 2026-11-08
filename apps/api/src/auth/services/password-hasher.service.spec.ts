import { BadRequestException } from '@nestjs/common';
import { PasswordHasherService } from './password-hasher.service';

describe('PasswordHasherService', () => {
  let service: PasswordHasherService;

  beforeEach(() => {
    service = new PasswordHasherService();
  });

  it('should hash password using Argon2id format ($argon2id$...)', async () => {
    const plain = 'correct-horse-battery-staple-passphrase';
    const hash = await service.hash(plain);

    expect(hash).toBeDefined();
    expect(hash).toMatch(/^\$argon2id\$v=\d+\$m=\d+,t=\d+,p=\d+\$/);
  });

  it('should successfully verify a correct password', async () => {
    const plain = 'super-secret-unique-passphrase-2026';
    const hash = await service.hash(plain);

    const isValid = await service.verify(hash, plain);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const plain = 'super-secret-unique-passphrase-2026';
    const hash = await service.hash(plain);

    const isValid = await service.verify(hash, 'wrong-passphrase-attempt-here');
    expect(isValid).toBe(false);
  });

  it('should reject passwords exceeding 128 UTF-8 bytes during hashing', async () => {
    // 129 bytes string
    const longPassword = 'a'.repeat(129);
    await expect(service.hash(longPassword)).rejects.toThrow(BadRequestException);
  });

  it('should return false when verifying a password exceeding 128 UTF-8 bytes', async () => {
    const hash = await service.hash('valid-passphrase-here-15-chars');
    const longPassword = 'a'.repeat(129);

    const isValid = await service.verify(hash, longPassword);
    expect(isValid).toBe(false);
  });

  it('should support needsRehash detection', async () => {
    const hash = await service.hash('valid-passphrase-here-15-chars');
    const needsRehash = await service.needsRehash(hash);
    expect(needsRehash).toBe(false);
  });
});
