import { describe, it, expect, vi, beforeEach } from 'vitest';

const nearbyMock = vi.fn();
const textSearchMock = vi.fn();
vi.mock('../../services/google-maps', () => ({
  nearbySearch: (...args: any[]) => nearbyMock(...args),
  textSearchPlaces: (...args: any[]) => textSearchMock(...args),
  getPhotoUrl: (ref: string) => `/api/photo?ref=${ref}`,
}));

import { findCandidates } from '../../services/places';

function makePlace(overrides: Partial<{ place_id: string; name: string; types: string[]; phone: string | null }> = {}) {
  return {
    place_id: overrides.place_id || 'p',
    name: overrides.name || 'Place',
    vicinity: '123 Main',
    geometry: { location: { lat: 1, lng: 2 } },
    rating: 4.5,
    price_level: 2,
    photos: [],
    phone: overrides.phone ?? null,
    types: overrides.types || ['restaurant'],
  };
}

describe('findCandidates', () => {
  beforeEach(() => {
    nearbyMock.mockReset();
    textSearchMock.mockReset();
  });

  it('keeps only places whose name or types match an included cuisine', async () => {
    nearbyMock.mockResolvedValueOnce([
      makePlace({ place_id: 'a', name: 'Luigi Italian Bistro', types: ['restaurant'] }),
      makePlace({ place_id: 'b', name: 'Tokyo Sushi',         types: ['restaurant'] }),
      makePlace({ place_id: 'c', name: 'Generic Diner',       types: ['restaurant'] }),
    ]);

    const candidates = await findCandidates(0, 0, 5000, 'dinner', ['italian']);
    expect(candidates.map((c) => c.placeId)).toEqual(['a']);
  });

  it('returns all candidates when no cuisineInclusions provided', async () => {
    nearbyMock.mockResolvedValueOnce([
      makePlace({ place_id: 'a', name: 'A' }),
      makePlace({ place_id: 'b', name: 'B' }),
    ]);

    const candidates = await findCandidates(0, 0, 5000, 'dinner');
    expect(candidates).toHaveLength(2);
  });

  it('uses textSearchPlaces and skips cuisine filter when brandQuery is provided', async () => {
    textSearchMock.mockResolvedValueOnce([
      makePlace({ place_id: 's1', name: 'Starbucks' }),
      makePlace({ place_id: 's2', name: 'Starbucks Reserve' }),
    ]);

    const candidates = await findCandidates(10, 20, 5000, 'coffee', ['italian'], 'Starbucks');

    // Brand search does NOT force includedType — cafes + restaurants both
    // match (e.g. Starbucks' primary type can be either).
    expect(textSearchMock).toHaveBeenCalledWith('Starbucks', 10, 20, 5000);
    expect(nearbyMock).not.toHaveBeenCalled();
    // Cuisine filter bypassed: Starbucks doesn't match 'italian' but is returned anyway.
    expect(candidates).toHaveLength(2);
  });

  it('trims whitespace-only brandQuery and falls back to nearby search', async () => {
    nearbyMock.mockResolvedValueOnce([makePlace({ place_id: 'a', name: 'A' })]);
    await findCandidates(0, 0, 5000, 'dinner', undefined, '   ');
    expect(nearbyMock).toHaveBeenCalled();
    expect(textSearchMock).not.toHaveBeenCalled();
  });

  it('propagates phone from the Places API response onto the candidate', async () => {
    nearbyMock.mockResolvedValueOnce([
      makePlace({ place_id: 'a', name: 'Luigi Italian', phone: '(415) 555-0184' }),
    ]);

    const [c] = await findCandidates(0, 0, 5000, 'dinner', ['italian']);
    expect(c.phone).toBe('(415) 555-0184');
  });

  it('filters out non-food primary types even in brand mode', async () => {
    textSearchMock.mockResolvedValueOnce([
      makePlace({ place_id: 'mall', name: 'Starbucks Mall', types: ['shopping_mall'] }),
      makePlace({ place_id: 'ok',   name: 'Starbucks',      types: ['cafe'] }),
    ]);

    const candidates = await findCandidates(0, 0, 5000, 'coffee', undefined, 'Starbucks');
    expect(candidates.map((c) => c.placeId)).toEqual(['ok']);
  });
});
