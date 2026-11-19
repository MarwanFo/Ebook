import { isDisposableEmail } from './disposable-email-validator';

describe('disposable-email-validator', () => {
  it('identifies known disposable email addresses', () => {
    expect(isDisposableEmail('spammer@mailinator.com')).toBe(true);
    expect(isDisposableEmail('bot@tempmail.com')).toBe(true);
    expect(isDisposableEmail('test@10minutemail.com')).toBe(true);
    expect(isDisposableEmail('user@sharklasers.com')).toBe(true);
    expect(isDisposableEmail('user@yopmail.com')).toBe(true);
  });

  it('allows legitimate email addresses', () => {
    expect(isDisposableEmail('reader@gmail.com')).toBe(false);
    expect(isDisposableEmail('alex@outlook.com')).toBe(false);
    expect(isDisposableEmail('author@proton.me')).toBe(false);
    expect(isDisposableEmail('dev@company.co.uk')).toBe(false);
  });

  it('handles invalid or empty inputs gracefully', () => {
    expect(isDisposableEmail('')).toBe(false);
    expect(isDisposableEmail('invalid-email')).toBe(false);
  });
});
