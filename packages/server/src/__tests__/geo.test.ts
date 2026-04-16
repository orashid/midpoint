import { describe, it, expect } from 'vitest';
import { haversineDistance, computeCentroid, computeSearchRadius } from '../../src/utils/geo';

describe('haversineDistance', () => {
  it('should return 0 for the same point', () => {
    const d = haversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
    expect(d).toBeCloseTo(0, 5);
  });

  it('should compute approximate distance between SF and LA', () => {
    // SF: 37.7749, -122.4194 — LA: 34.0522, -118.2437
    const d = haversineDistance(37.7749, -122.4194, 34.0522, -118.2437);
    // Known distance is roughly 559 km
    expect(d).toBeGreaterThan(540);
    expect(d).toBeLessThan(580);
  });

  it('should be symmetric', () => {
    const d1 = haversineDistance(40.7128, -74.006, 51.5074, -0.1278);
    const d2 = haversineDistance(51.5074, -0.1278, 40.7128, -74.006);
    expect(d1).toBeCloseTo(d2, 5);
  });
});

describe('computeCentroid', () => {
  it('should throw for an empty array', () => {
    expect(() => computeCentroid([])).toThrow('Cannot compute centroid of empty array');
  });

  it('should return the same point for a single-element array', () => {
    const result = computeCentroid([{ lat: 10, lng: 20 }]);
    expect(result.lat).toBeCloseTo(10);
    expect(result.lng).toBeCloseTo(20);
  });

  it('should compute the average of two points', () => {
    const result = computeCentroid([
      { lat: 10, lng: 20 },
      { lat: 30, lng: 40 },
    ]);
    expect(result.lat).toBeCloseTo(20);
    expect(result.lng).toBeCloseTo(30);
  });

  it('should compute centroid of multiple points', () => {
    const result = computeCentroid([
      { lat: 0, lng: 0 },
      { lat: 10, lng: 10 },
      { lat: 20, lng: 20 },
    ]);
    expect(result.lat).toBeCloseTo(10);
    expect(result.lng).toBeCloseTo(10);
  });
});

describe('computeSearchRadius', () => {
  it('should return minimum 3000 for nearby points', () => {
    const r = computeSearchRadius([
      { lat: 37.7749, lng: -122.4194 },
      { lat: 37.7750, lng: -122.4195 },
    ]);
    expect(r).toBe(3000);
  });

  it('should not exceed 25000', () => {
    // Points very far apart
    const r = computeSearchRadius([
      { lat: 0, lng: 0 },
      { lat: 50, lng: 50 },
    ]);
    expect(r).toBe(25000);
  });

  it('should return 3000 for a single point', () => {
    const r = computeSearchRadius([{ lat: 37.7749, lng: -122.4194 }]);
    // Single point means maxDist=0, radius=0 => clamp to 3000
    expect(r).toBe(3000);
  });
});
