import { describe, it, expect } from 'vitest';

describe('auth-providers', () => {
  describe('ProviderProfile shape', () => {
    it('should accept a valid ProviderProfile', async () => {
      // ProviderProfile is a TS interface (erased at runtime), so we test
      // that the module exports the verifier functions with correct types.
      const mod = await import('../services/auth-providers');
      expect(typeof mod.verifyGoogle).toBe('function');
      expect(typeof mod.verifyProviderToken).toBe('function');
    });
  });

  describe('verifyProviderToken', () => {
    it('should throw for unsupported provider', async () => {
      const { verifyProviderToken } = await import('../services/auth-providers');
      await expect(verifyProviderToken('twitter', 'some-token')).rejects.toThrow(
        'Unsupported provider: twitter'
      );
    });

    it('should throw for empty provider', async () => {
      const { verifyProviderToken } = await import('../services/auth-providers');
      await expect(verifyProviderToken('', 'some-token')).rejects.toThrow(
        'Unsupported provider: '
      );
    });
  });

  describe('verifyGoogle', () => {
    it('should reject a clearly invalid token', async () => {
      const { verifyGoogle } = await import('../services/auth-providers');
      // A random string isn't a valid JWT — Google's library will reject it
      await expect(verifyGoogle('not-a-real-token')).rejects.toThrow();
    });
  });
});
