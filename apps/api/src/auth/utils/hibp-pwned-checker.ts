import * as crypto from 'node:crypto';
import { Logger } from '@nestjs/common';

const logger = new Logger('HibpPwnedChecker');

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
export async function isPasswordBreached(password: string): Promise<boolean> {
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
          logger.warn(
            `Passphrase matched breached credential database (frequency: ${count} public leaks).`,
          );
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    logger.warn(`HIBP breach check bypassed: ${(err as Error).message}`);
    return false;
  }
}
