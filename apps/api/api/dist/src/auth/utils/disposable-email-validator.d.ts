/**
 * Curated list of high-volume disposable and throwaway email domains.
 * Blocks burner inboxes, spam generators, and bot farms.
 */
export declare const DISPOSABLE_EMAIL_DOMAINS: Set<string>;
/**
 * Checks if an email address belongs to a known temporary/disposable provider.
 */
export declare function isDisposableEmail(email: string): boolean;
//# sourceMappingURL=disposable-email-validator.d.ts.map