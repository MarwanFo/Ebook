import { isPasswordBreached } from './hibp-pwned-checker';

describe('hibp-pwned-checker', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('detects breached password when hash suffix is found in HIBP response', async () => {
    // SHA-1 of "password12345678" is 2317AA72DAFA0A07F05AF47BAA2E388F95DCF6F3
    // prefix: 2317A, suffix: A72DAFA0A07F05AF47BAA2E388F95DCF6F3
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        'OTHERHASH1234567890123456789012345:10\r\nA72DAFA0A07F05AF47BAA2E388F95DCF6F3:154\r\n',
    } as any);

    const isBreached = await isPasswordBreached('password12345678');
    expect(isBreached).toBe(true);
  });

  it('returns false when hash suffix is NOT in HIBP response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        'SOMEOTHERHASH123456789012345678901:5\r\nANOTHERHASH1234567890123456789012:2\r\n',
    } as any);

    const isBreached = await isPasswordBreached('ultra-rare-unique-passphrase-2026-xyz');
    expect(isBreached).toBe(false);
  });

  it('fails open gracefully if HIBP API returns an HTTP error or times out', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network connection timeout'));

    const isBreached = await isPasswordBreached('any-passphrase');
    expect(isBreached).toBe(false);
  });
});
