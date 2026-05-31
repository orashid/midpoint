/**
 * Tests for the storage abstraction layer.
 *
 * These pin the auth+API+cache fallback behavior of every public function.
 * The bug that motivated this suite: `removeVisit` was silently dropping
 * the API call for authenticated users when callers didn't pass a `visitId`
 * — the local cache was updated but the server still had the visit, so the
 * deleted row reappeared on the next refresh. The `removeVisit` block below
 * pins the contract that prevents that regression.
 */
jest.mock('../../api/client', () => ({
  isAuthenticated: jest.fn(),
}));
jest.mock('../../api/userData', () => ({
  fetchSpots: jest.fn(),
  createSpot: jest.fn(),
  deleteSpot: jest.fn(),
  updateSpotRating: jest.fn(),
  updateSpotCuisine: jest.fn(),
  logVisit: jest.fn(),
  removeVisit: jest.fn(),
  fetchPeople: jest.fn(),
  upsertPerson: jest.fn(),
  upsertPeopleBatch: jest.fn(),
  deletePerson: jest.fn(),
  fetchSearches: jest.fn(),
  saveSearch: jest.fn(),
  togglePinSearch: jest.fn(),
  deleteSearch: jest.fn(),
  fetchPreferences: jest.fn(),
  savePreferences: jest.fn(),
  fetchMyInfo: jest.fn(),
  saveMyInfo: jest.fn(),
}));
jest.mock('../cache', () => ({
  getOurSpots: jest.fn(),
  saveSpot: jest.fn(),
  removeSpot: jest.fn(),
  updateSpotRating: jest.fn(),
  updateSpotCuisine: jest.fn(),
  logVisit: jest.fn(),
  removeVisit: jest.fn(),
  getSavedPeople: jest.fn(),
  savePerson: jest.fn(),
  saveAllParticipants: jest.fn(),
  deleteSavedPerson: jest.fn(),
  dedupPeople: jest.fn((p) => p),
  getRecentSearches: jest.fn(),
  saveRecentSearch: jest.fn(),
  togglePinSearch: jest.fn(),
  deleteRecentSearch: jest.fn(),
  getPreferences: jest.fn(),
  savePreferences: jest.fn(),
  getMyInfo: jest.fn(),
  saveMyInfo: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

import { isAuthenticated } from '../../api/client';
import * as api from '../../api/userData';
import * as cache from '../cache';
import * as repo from '../repository';

const mockAuth = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('removeVisit (regression: visit-delete bug)', () => {
  it('calls the API and skips the cache when authenticated and visitId is supplied', async () => {
    mockAuth.mockReturnValue(true);
    (api.removeVisit as jest.Mock).mockResolvedValue(undefined);

    await repo.removeVisit('place-1', 1700000000000, 'visit-7');

    expect(api.removeVisit).toHaveBeenCalledWith('place-1', 'visit-7');
    expect(cache.removeVisit).not.toHaveBeenCalled();
  });

  it('falls back to the cache when authenticated but visitId is missing', async () => {
    // This is the buggy behavior the fix exposes — we keep the safety net
    // (so legacy local visits without ids can still be removed offline) but
    // the production call site must now always supply visitId.
    mockAuth.mockReturnValue(true);

    await repo.removeVisit('place-1', 1700000000000);

    expect(api.removeVisit).not.toHaveBeenCalled();
    expect(cache.removeVisit).toHaveBeenCalledWith('place-1', 1700000000000);
  });

  it('falls back to the cache when the API call fails', async () => {
    mockAuth.mockReturnValue(true);
    (api.removeVisit as jest.Mock).mockRejectedValue(new Error('network'));

    await repo.removeVisit('place-1', 1700000000000, 'visit-7');

    expect(api.removeVisit).toHaveBeenCalledWith('place-1', 'visit-7');
    expect(cache.removeVisit).toHaveBeenCalledWith('place-1', 1700000000000);
  });

  it('uses the cache when not authenticated, regardless of visitId', async () => {
    mockAuth.mockReturnValue(false);

    await repo.removeVisit('place-1', 1700000000000, 'visit-7');

    expect(api.removeVisit).not.toHaveBeenCalled();
    expect(cache.removeVisit).toHaveBeenCalledWith('place-1', 1700000000000);
  });
});

describe('getOurSpots', () => {
  it('returns server data sorted by dateAdded desc when authenticated', async () => {
    mockAuth.mockReturnValue(true);
    (api.fetchSpots as jest.Mock).mockResolvedValue([
      { placeId: 'a', dateAdded: 100 },
      { placeId: 'b', dateAdded: 300 },
      { placeId: 'c', dateAdded: 200 },
    ]);

    const spots = await repo.getOurSpots();

    expect(spots.map((s: any) => s.placeId)).toEqual(['b', 'c', 'a']);
    expect(cache.getOurSpots).not.toHaveBeenCalled();
  });

  it('falls back to the cache when the server call fails', async () => {
    mockAuth.mockReturnValue(true);
    (api.fetchSpots as jest.Mock).mockRejectedValue(new Error('offline'));
    (cache.getOurSpots as jest.Mock).mockResolvedValue([{ placeId: 'cached' }]);

    const spots = await repo.getOurSpots();

    expect(spots).toEqual([{ placeId: 'cached' }]);
  });

  it('reads from the cache when not authenticated', async () => {
    mockAuth.mockReturnValue(false);
    (cache.getOurSpots as jest.Mock).mockResolvedValue([{ placeId: 'local' }]);

    const spots = await repo.getOurSpots();

    expect(spots).toEqual([{ placeId: 'local' }]);
    expect(api.fetchSpots).not.toHaveBeenCalled();
  });
});

describe('saveSpot / removeSpot / updateSpotRating / updateSpotCuisine', () => {
  const spot = {
    placeId: 'p',
    name: 'n',
    address: 'a',
    lat: 0,
    lng: 0,
    cuisineType: 'italian',
    familyRating: 4,
    photoUrl: null,
    phone: null,
  };

  it('saveSpot calls the API when authenticated and skips the cache', async () => {
    mockAuth.mockReturnValue(true);
    (api.createSpot as jest.Mock).mockResolvedValue(undefined);

    await repo.saveSpot(spot as any);

    expect(api.createSpot).toHaveBeenCalledWith(spot);
    expect(cache.saveSpot).not.toHaveBeenCalled();
  });

  it('saveSpot falls back to the cache on API failure', async () => {
    mockAuth.mockReturnValue(true);
    (api.createSpot as jest.Mock).mockRejectedValue(new Error('boom'));

    await repo.saveSpot(spot as any);

    expect(cache.saveSpot).toHaveBeenCalledWith(spot);
  });

  it('removeSpot routes through the API then short-circuits', async () => {
    mockAuth.mockReturnValue(true);
    (api.deleteSpot as jest.Mock).mockResolvedValue(undefined);

    await repo.removeSpot('p');

    expect(api.deleteSpot).toHaveBeenCalledWith('p');
    expect(cache.removeSpot).not.toHaveBeenCalled();
  });

  it('updateSpotRating uses cache when offline', async () => {
    mockAuth.mockReturnValue(false);

    await repo.updateSpotRating('p', 5);

    expect(api.updateSpotRating).not.toHaveBeenCalled();
    expect(cache.updateSpotRating).toHaveBeenCalledWith('p', 5);
  });

  it('updateSpotCuisine routes through API when authenticated', async () => {
    mockAuth.mockReturnValue(true);
    (api.updateSpotCuisine as jest.Mock).mockResolvedValue(undefined);

    await repo.updateSpotCuisine('p', 'thai');

    expect(api.updateSpotCuisine).toHaveBeenCalledWith('p', 'thai');
    expect(cache.updateSpotCuisine).not.toHaveBeenCalled();
  });
});

describe('logVisit', () => {
  it('calls API with the optional date when authenticated', async () => {
    mockAuth.mockReturnValue(true);
    (api.logVisit as jest.Mock).mockResolvedValue({ id: 'v', date: 1 });

    await repo.logVisit('p', 12345);

    expect(api.logVisit).toHaveBeenCalledWith('p', 12345);
    expect(cache.logVisit).not.toHaveBeenCalled();
  });

  it('falls back to cache when API throws', async () => {
    mockAuth.mockReturnValue(true);
    (api.logVisit as jest.Mock).mockRejectedValue(new Error('500'));

    await repo.logVisit('p', 12345);

    expect(cache.logVisit).toHaveBeenCalledWith('p', 12345);
  });
});

describe('Searches', () => {
  it('getRecentSearches normalizes legacy fields from the server', async () => {
    mockAuth.mockReturnValue(true);
    (api.fetchSearches as jest.Mock).mockResolvedValue([
      { id: '1', timestamp: 0, pinned: false }, // missing arrays
      { id: '2', timestamp: 0, pinned: false, dietaryRestrictions: ['veg'], cuisineInclusions: ['it'] },
    ]);

    const searches = await repo.getRecentSearches();

    expect(searches[0].dietaryRestrictions).toEqual([]);
    expect(searches[0].cuisineInclusions).toEqual([]);
    expect(searches[1].dietaryRestrictions).toEqual(['veg']);
    expect(searches[1].cuisineInclusions).toEqual(['it']);
  });

  it('saveRecentSearch goes to API when authenticated', async () => {
    mockAuth.mockReturnValue(true);
    (api.saveSearch as jest.Mock).mockResolvedValue(undefined);

    await repo.saveRecentSearch({} as any);

    expect(api.saveSearch).toHaveBeenCalled();
    expect(cache.saveRecentSearch).not.toHaveBeenCalled();
  });

  it('togglePinSearch falls back to cache on API failure', async () => {
    mockAuth.mockReturnValue(true);
    (api.togglePinSearch as jest.Mock).mockRejectedValue(new Error('x'));

    await repo.togglePinSearch('id-1');

    expect(cache.togglePinSearch).toHaveBeenCalledWith('id-1');
  });

  it('deleteRecentSearch uses cache when not authenticated', async () => {
    mockAuth.mockReturnValue(false);

    await repo.deleteRecentSearch('id-1');

    expect(api.deleteSearch).not.toHaveBeenCalled();
    expect(cache.deleteRecentSearch).toHaveBeenCalledWith('id-1');
  });
});

describe('People', () => {
  it('getSavedPeople dedupes server data and sorts by useCount desc', async () => {
    mockAuth.mockReturnValue(true);
    const incoming = [{ name: 'a', useCount: 1 }, { name: 'b', useCount: 5 }];
    (api.fetchPeople as jest.Mock).mockResolvedValue(incoming);
    (cache.dedupPeople as jest.Mock).mockReturnValue(incoming);

    const people = await repo.getSavedPeople();

    expect(cache.dedupPeople).toHaveBeenCalledWith(incoming);
    expect((people as any[]).map((p) => p.name)).toEqual(['b', 'a']);
  });

  it('savePerson uses API when authenticated', async () => {
    mockAuth.mockReturnValue(true);
    (api.upsertPerson as jest.Mock).mockResolvedValue(undefined);

    await repo.savePerson({ name: 'a', address: 'b', lat: 0, lng: 0 });

    expect(api.upsertPerson).toHaveBeenCalled();
    expect(cache.savePerson).not.toHaveBeenCalled();
  });

  it('saveAllParticipants batches via API', async () => {
    mockAuth.mockReturnValue(true);
    (api.upsertPeopleBatch as jest.Mock).mockResolvedValue(undefined);

    await repo.saveAllParticipants([{ name: 'a', address: 'b', lat: 0, lng: 0 }]);

    expect(api.upsertPeopleBatch).toHaveBeenCalled();
  });

  it('deleteSavedPerson scopes to the offline cache when unauthenticated', async () => {
    mockAuth.mockReturnValue(false);

    await repo.deleteSavedPerson('alice', '1 main');

    expect(api.deletePerson).not.toHaveBeenCalled();
    expect(cache.deleteSavedPerson).toHaveBeenCalledWith('alice', '1 main');
  });
});

describe('Preferences and MyInfo', () => {
  it('getPreferences normalizes mealType + array fields', async () => {
    mockAuth.mockReturnValue(true);
    (api.fetchPreferences as jest.Mock).mockResolvedValue({
      mealType: undefined,
      dietaryRestrictions: null,
      cuisineInclusions: 'not-an-array',
      myInfo: null,
    });

    const prefs = await repo.getPreferences();

    expect(prefs).toEqual({
      mealType: 'dinner',
      dietaryRestrictions: [],
      cuisineInclusions: [],
    });
  });

  it('savePreferences round-trips to API', async () => {
    mockAuth.mockReturnValue(true);
    (api.savePreferences as jest.Mock).mockResolvedValue(undefined);

    await repo.savePreferences({
      mealType: 'lunch',
      dietaryRestrictions: ['veg'],
      cuisineInclusions: ['thai'],
    });

    expect(api.savePreferences).toHaveBeenCalled();
    expect(cache.savePreferences).not.toHaveBeenCalled();
  });

  it('getMyInfo returns nested myInfo from /preferences when authenticated', async () => {
    mockAuth.mockReturnValue(true);
    const myInfo = { name: 'OB', address: '1 home', lat: 0, lng: 0 };
    (api.fetchPreferences as jest.Mock).mockResolvedValue({ myInfo });

    const result = await repo.getMyInfo();

    expect(result).toEqual(myInfo);
  });

  it('saveMyInfo goes through cache when offline', async () => {
    mockAuth.mockReturnValue(false);

    await repo.saveMyInfo({ name: 'OB', address: '1 home', lat: 0, lng: 0 });

    expect(api.saveMyInfo).not.toHaveBeenCalled();
    expect(cache.saveMyInfo).toHaveBeenCalled();
  });
});
