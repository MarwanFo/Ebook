import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordHasherService {
  /**
   * Centralized OWASP / RFC 9106 Argon2id parameters:
   * - Type: Argon2id (hybrid resistant against side-channel and GPU/ASIC attacks)
   * - Memory: 64 MB (65536 KiB)
   * - Iterations / Time cost: 3
   * - Parallelism: 4 lanes/threads
   * - Hash length: 32 bytes
   */
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
    hashLength: 32,
  };

  /**
   * Hard maximum of 128 UTF-8 bytes to prevent CPU/memory exhaustion attacks.
   */
  public static readonly MAX_PASSWORD_BYTES = 128;
  public static readonly MIN_PASSWORD_CODE_POINTS = 15;

  /**
   * Hashes a plaintext password using Argon2id.
   */
  async hash(password: string): Promise<string> {
    const byteLength = Buffer.byteLength(password, 'utf8');
    if (byteLength > PasswordHasherService.MAX_PASSWORD_BYTES) {
      throw new BadRequestException('Password exceeds maximum allowed limit of 128 UTF-8 bytes.');
    }
    return argon2.hash(password, this.options);
  }

  /**
   * Verifies a plaintext password against an Argon2 encoded hash.
   */
  async verify(hash: string, plain: string): Promise<boolean> {
    const byteLength = Buffer.byteLength(plain, 'utf8');
    if (byteLength > PasswordHasherService.MAX_PASSWORD_BYTES) {
      return false;
    }
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /**
   * Checks if a stored hash needs rehashing due to upgraded parameters.
   */
  async needsRehash(hash: string): Promise<boolean> {
    return argon2.needsRehash(hash, this.options);
  }
}
