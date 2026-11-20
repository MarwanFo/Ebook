export declare class PasswordHasherService {
    /**
     * Centralized OWASP / RFC 9106 Argon2id parameters:
     * - Type: Argon2id (hybrid resistant against side-channel and GPU/ASIC attacks)
     * - Memory: 64 MB (65536 KiB)
     * - Iterations / Time cost: 3
     * - Parallelism: 4 lanes/threads
     * - Hash length: 32 bytes
     */
    private readonly options;
    /**
     * Hard maximum of 128 UTF-8 bytes to prevent CPU/memory exhaustion attacks.
     */
    static readonly MAX_PASSWORD_BYTES = 128;
    static readonly MIN_PASSWORD_CODE_POINTS = 15;
    /**
     * Hashes a plaintext password using Argon2id.
     */
    hash(password: string): Promise<string>;
    /**
     * Verifies a plaintext password against an Argon2 encoded hash.
     */
    verify(hash: string, plain: string): Promise<boolean>;
    /**
     * Checks if a stored hash needs rehashing due to upgraded parameters.
     */
    needsRehash(hash: string): Promise<boolean>;
}
//# sourceMappingURL=password-hasher.service.d.ts.map