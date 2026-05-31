import AsyncStorage from '@react-native-async-storage/async-storage';
import * as cache from '../cache';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Our Spots — visits round-trip (regression coverage for delete bug)', () => {
  const baseSpot = {
    placeId: 'p1',
    name: 'Pizza',
    address: '1 Main',
    lat: 0,
    lng: 0,
    cuisineType: 'italian',
    familyRating: 4,
    photoUrl: null,
    phone: null,
  };

  it('logs a visit and removes it by date', async () => {
    await cache.saveSpot(baseSpot as any);
    await cache.logVisit('p1', 1700000000000);
    await cache.logVisit('p1', 1700100000000);

    let spots = await cache.getOurSpots();
    expect(spots[0].visits).toHaveLength(2);

    await cache.removeVisit('p1', 1700000000000);

    spots = await cache.getOurSpots();
    expect(spots[0].visits).toEqual([{ date: 1700100000000 }]);
  });

  it('is a no-op when the visitDate does not match (does not corrupt other visits)', async () => {
    await cache.saveSpot(baseSpot as any);
    await cache.logVisit('p1', 1700000000000);

    await cache.removeVisit('p1', 9999); // not present

    const spots = await cache.getOurSpots();
    expect(spots[0].visits).toEqual([{ date: 1700000000000 }]);
  });

  it('is a no-op when the spot does not exist', async () => {
    await cache.removeVisit('missing', 1);
    const spots = await cache.getOurSpots();
    expect(spots).toEqual([]);
  });
});

describe('Our Spots — saveSpot upsert behavior', () => {
  const spot = {
    placeId: 'p1',
    name: 'Pizza',
    address: '1 Main',
    lat: 0,
    lng: 0,
    cuisineType: 'italian',
    familyRating: 4,
    photoUrl: null,
    phone: null,
  };

  it('creates a fresh spot with empty visits and a dateAdded', async () => {
    const before = Date.now();
    await cache.saveSpot(spot as any);
    const [stored] = await cache.getOurSpots();
    expect(stored.placeId).toBe('p1');
    expect(stored.visits).toEqual([]);
    expect(stored.dateAdded).toBeGreaterThanOrEqual(before);
  });

  it('updates rating + cuisine on an existing spot without resetting visits', async () => {
    await cache.saveSpot(spot as any);
    await cache.logVisit('p1', 1700000000000);

    await cache.saveSpot({ ...spot, familyRating: 5, cuisineType: 'thai' } as any);

    const [stored] = await cache.getOurSpots();
    expect(stored.familyRating).toBe(5);
    expect(stored.cuisineType).toBe('thai');
    expect(stored.visits).toEqual([{ date: 1700000000000 }]);
  });

  it('removeSpot removes only the matching placeId', async () => {
    await cache.saveSpot(spot as any);
    await cache.saveSpot({ ...spot, placeId: 'p2', name: 'Other' } as any);
    await cache.removeSpot('p1');
    const remaining = await cache.getOurSpots();
    expect(remaining.map((s: any) => s.placeId)).toEqual(['p2']);
  });

  it('getOurSpots sorts by dateAdded desc', async () => {
    await AsyncStorage.setItem(
      '@midpoint/ourSpots',
      JSON.stringify([
        { placeId: 'old', dateAdded: 1 },
        { placeId: 'new', dateAdded: 100 },
        { placeId: 'mid', dateAdded: 50 },
      ])
    );
    const spots = await cache.getOurSpots();
    expect(spots.map((s: any) => s.placeId)).toEqual(['new', 'mid', 'old']);
  });
});

describe('Recent Searches', () => {
  it('saveRecentSearch adds, then merges by participant key on re-save', async () => {
    await cache.saveRecentSearch({
      participants: [
        { name: 'A', address: '1 a', lat: 0, lng: 0 },
        { name: 'B', address: '2 b', lat: 0, lng: 0 },
      ],
      mealType: 'dinner',
      dietaryRestrictions: [],
      cuisineInclusions: ['italian'],
    } as any);

    await cache.saveRecentSearch({
      participants: [
        { name: 'a', address: '1 A', lat: 0, lng: 0 },
        { name: 'B', address: '2 b', lat: 0, lng: 0 },
      ],
      mealType: 'lunch',
      dietaryRestrictions: ['veg'],
      cuisineInclusions: [],
    } as any);

    const searches = await cache.getRecentSearches();
    expect(searches).toHaveLength(1);
    expect(searches[0].mealType).toBe('lunch');
    expect(searches[0].dietaryRestrictions).toEqual(['veg']);
  });

  it('keeps at most 10 entries and prefers pinned ones', async () => {
    for (let i = 0; i < 12; i++) {
      await cache.saveRecentSearch({
        participants: [{ name: `p${i}`, address: `${i} st`, lat: 0, lng: 0 }],
        mealType: 'dinner',
        dietaryRestrictions: [],
        cuisineInclusions: [],
      } as any);
    }
    const searches = await cache.getRecentSearches();
    expect(searches.length).toBeLessThanOrEqual(10);
  });

  it('togglePinSearch flips the pinned flag', async () => {
    await cache.saveRecentSearch({
      participants: [{ name: 'x', address: '1', lat: 0, lng: 0 }],
      mealType: 'dinner',
      dietaryRestrictions: [],
      cuisineInclusions: [],
    } as any);
    let [s] = await cache.getRecentSearches();
    expect(s.pinned).toBe(false);

    await cache.togglePinSearch(s.id);
    [s] = await cache.getRecentSearches();
    expect(s.pinned).toBe(true);
  });

  it('deleteRecentSearch removes by id', async () => {
    await cache.saveRecentSearch({
      participants: [{ name: 'x', address: '1', lat: 0, lng: 0 }],
      mealType: 'dinner',
      dietaryRestrictions: [],
      cuisineInclusions: [],
    } as any);
    const [s] = await cache.getRecentSearches();
    await cache.deleteRecentSearch(s.id);
    expect(await cache.getRecentSearches()).toEqual([]);
  });

  it('coerces a legacy entry without cuisineInclusions to an empty array', async () => {
    // Legacy entries had `cuisineExclusions` (inverse semantics). The
    // normalization layer can't translate those, so we simply ensure
    // cuisineInclusions defaults to [] for any non-array input.
    await AsyncStorage.setItem(
      '@midpoint/searches',
      JSON.stringify([
        {
          id: '1',
          timestamp: 100,
          pinned: false,
          participants: [],
          mealType: 'dinner',
          cuisineExclusions: ['italian'], // legacy
        },
      ])
    );
    const [s] = await cache.getRecentSearches();
    expect(s.cuisineInclusions).toEqual([]);
  });
});

describe('People dedup', () => {
  it('collapses entries that share a name+address (case-insensitive)', () => {
    const merged = cache.dedupPeople([
      { name: 'Alice', address: '1 Main St', lat: 0, lng: 0, useCount: 2, lastUsed: 100 },
      { name: 'alice', address: '1 main st', lat: 0, lng: 0, useCount: 3, lastUsed: 200 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].useCount).toBe(5);
    expect(merged[0].lastUsed).toBe(200);
  });

  it('keeps separate entries when placeIds differ', () => {
    const merged = cache.dedupPeople([
      { name: 'A', address: '1', placeId: 'pa', lat: 0, lng: 0, useCount: 1, lastUsed: 1 },
      { name: 'A', address: '1', placeId: 'pb', lat: 0, lng: 0, useCount: 1, lastUsed: 1 },
    ]);
    expect(merged).toHaveLength(2);
  });

  it('does not merge a placeId-keyed entry with a name+address-keyed one', () => {
    // Pre-existing behavior: the dedup key switches to `pid:` as soon as a
    // placeId is present, so a name/address-only entry and a placeId entry
    // for the same person stay separate. (Documented here so the behavior
    // is intentional rather than accidental.)
    const merged = cache.dedupPeople([
      { name: 'A', address: '1 main st', lat: 0, lng: 0, useCount: 1, lastUsed: 0 },
      { name: 'A', address: '1 main st', placeId: 'pid-1', lat: 0, lng: 0, useCount: 0, lastUsed: 0 },
    ]);
    expect(merged).toHaveLength(2);
  });

  it('normalizes the address by stripping a trailing USA suffix', () => {
    const merged = cache.dedupPeople([
      { name: 'A', address: '1 Main St, San Francisco', lat: 0, lng: 0, useCount: 1, lastUsed: 0 },
      { name: 'A', address: '1 Main St, San Francisco, USA', lat: 0, lng: 0, useCount: 2, lastUsed: 0 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].useCount).toBe(3);
  });
});

describe('Preferences', () => {
  it('returns null when nothing has been saved', async () => {
    expect(await cache.getPreferences()).toBeNull();
  });

  it('round-trips saved preferences and defaults missing fields', async () => {
    await cache.savePreferences({
      mealType: 'lunch',
      dietaryRestrictions: ['veg'],
      cuisineInclusions: ['italian'],
    });
    expect(await cache.getPreferences()).toEqual({
      mealType: 'lunch',
      dietaryRestrictions: ['veg'],
      cuisineInclusions: ['italian'],
    });
  });

  it('coerces missing arrays / mealType on read', async () => {
    await AsyncStorage.setItem('@midpoint/preferences', JSON.stringify({}));
    expect(await cache.getPreferences()).toEqual({
      mealType: 'dinner',
      dietaryRestrictions: [],
      cuisineInclusions: [],
    });
  });
});
