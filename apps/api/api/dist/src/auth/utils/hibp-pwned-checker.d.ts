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
export declare function isPasswordBreached(password: string): Promise<boolean>;
//# sourceMappingURL=hibp-pwned-checker.d.ts.map