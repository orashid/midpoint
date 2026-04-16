import { describe, it, expect } from 'vitest';
import { config, googleClientIds } from '../config';

describe('config', () => {
  it('should export a config object with expected keys', () => {
    expect(config).toHaveProperty('port');
    expect(config).toHaveProperty('jwtSecret');
    expect(config).toHaveProperty('googleClientId');
    expect(config).toHaveProperty('googleIosClientId');
    expect(config).toHaveProperty('googleAndroidClientId');
    expect(config).toHaveProperty('googleMapsApiKey');
    expect(config).toHaveProperty('databaseUrl');
  });

  it('should have port as a number', () => {
    expect(typeof config.port).toBe('number');
    expect(config.port).toBeGreaterThan(0);
  });

  it('should export googleClientIds as an array', () => {
    expect(Array.isArray(googleClientIds)).toBe(true);
  });

  it('should only include non-empty strings in googleClientIds', () => {
    for (const id of googleClientIds) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }
  });

  it('should not include empty strings in googleClientIds', () => {
    expect(googleClientIds).not.toContain('');
  });
});
