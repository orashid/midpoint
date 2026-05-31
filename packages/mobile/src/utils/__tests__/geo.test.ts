import { haversineDistance, formatDistance } from '../geo';

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance(37.7749, -122.4194, 37.7749, -122.4194)).toBe(0);
  });

  it('approximates the SF → NY great-circle distance (~4129 km)', () => {
    const km = haversineDistance(37.7749, -122.4194, 40.7128, -74.006);
    expect(km).toBeGreaterThan(4100);
    expect(km).toBeLessThan(4150);
  });

  it('is symmetric in its inputs', () => {
    const a = haversineDistance(37.7749, -122.4194, 40.7128, -74.006);
    const b = haversineDistance(40.7128, -74.006, 37.7749, -122.4194);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('formatDistance', () => {
  it('uses meters for very small distances', () => {
    expect(formatDistance(0.05)).toBe('50 m');
  });

  it('uses miles with one decimal otherwise', () => {
    expect(formatDistance(1.609344)).toBe('1.0 mi'); // 1 mile in km
  });

  it('rounds correctly at the meter/mile boundary', () => {
    // 0.1 km = 100 m, but 0.1 km * 0.621... = 0.0621 mi which is < 0.1 → meters
    expect(formatDistance(0.1)).toBe('100 m');
    // 0.2 km = 0.124 mi → miles
    expect(formatDistance(0.2)).toBe('0.1 mi');
  });
});
