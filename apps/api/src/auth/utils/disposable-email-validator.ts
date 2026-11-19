/**
 * Curated list of high-volume disposable and throwaway email domains.
 * Blocks burner inboxes, spam generators, and bot farms.
 */
export const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'burnermail.io',
  'crazymailing.com',
  'dispostable.com',
  'dropmail.me',
  'emailondeck.com',
  'fakemailgenerator.com',
  'generator.email',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.biz',
  'guerrillamail.com',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'inboxkitten.com',
  'mailcatch.com',
  'mailinator.com',
  'mailnesia.com',
  'mohmal.com',
  'mytrashmail.com',
  'sharklasers.com',
  'temp-mail.org',
  'tempail.com',
  'tempmail.com',
  'tempmail.net',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
]);

/**
 * Checks if an email address belongs to a known temporary/disposable provider.
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes('@')) {
    return false;
  }

  const domain = email.trim().split('@').pop()?.toLowerCase();
  if (!domain) {
    return false;
  }

  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}
