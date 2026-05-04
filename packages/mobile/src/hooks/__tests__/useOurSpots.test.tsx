import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('../../storage/repository', () => ({
  getOurSpots: jest.fn(),
  saveSpot: jest.fn(),
  removeSpot: jest.fn(),
  updateSpotRating: jest.fn(),
  logVisit: jest.fn(),
  removeVisit: jest.fn(),
  updateSpotCuisine: jest.fn(),
}));

import * as repo from '../../storage/repository';
import { useOurSpots, formatPickReason } from '../useOurSpots';

const baseSpot = (over: any = {}) => ({
  placeId: 'p1',
  name: 'Pizza',
  address: '1 Main',
  lat: 37.7749,
  lng: -122.4194,
  cuisineType: 'italian',
  familyRating: 4,
  photoUrl: null,
  phone: null,
  visits: [],
  dateAdded: 0,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  (repo.getOurSpots as jest.Mock).mockResolvedValue([]);
});

describe('useOurSpots — load + refresh', () => {
  it('loads spots on mount and exposes loading=false once resolved', async () => {
    (repo.getOurSpots as jest.Mock).mockResolvedValue([baseSpot()]);

    const { result } = renderHook(() => useOurSpots());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.spots).toHaveLength(1);
  });
});

describe('useOurSpots — mutations refresh state', () => {
  it('addSpot calls saveSpot then refreshes', async () => {
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    (repo.getOurSpots as jest.Mock).mockResolvedValue([baseSpot({ placeId: 'new' })]);
    await act(async () => {
      await result.current.addSpot({ placeId: 'new' } as any);
    });

    expect(repo.saveSpot).toHaveBeenCalledWith({ placeId: 'new' });
    expect(result.current.spots[0].placeId).toBe('new');
  });

  it('removeVisit threads visitId through to repository', async () => {
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeVisit('p1', 1700000000000, 'visit-7');
    });

    expect(repo.removeVisit).toHaveBeenCalledWith('p1', 1700000000000, 'visit-7');
  });

  it('removeVisit forwards undefined visitId for offline-only callers', async () => {
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeVisit('p1', 1700000000000);
    });

    expect(repo.removeVisit).toHaveBeenCalledWith('p1', 1700000000000, undefined);
  });

  it('logVisit, updateRating, updateCuisine, removeSpot all delegate to repository', async () => {
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.logVisit('p1', 100);
      await result.current.updateRating('p1', 5);
      await result.current.updateCuisine('p1', 'thai');
      await result.current.removeSpot('p1');
    });

    expect(repo.logVisit).toHaveBeenCalledWith('p1', 100);
    expect(repo.updateSpotRating).toHaveBeenCalledWith('p1', 5);
    expect(repo.updateSpotCuisine).toHaveBeenCalledWith('p1', 'thai');
    expect(repo.removeSpot).toHaveBeenCalledWith('p1');
  });
});

describe('useOurSpots — derived helpers', () => {
  it('isSpotSaved checks the in-memory list', async () => {
    (repo.getOurSpots as jest.Mock).mockResolvedValue([baseSpot({ placeId: 'in' })]);
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isSpotSaved('in')).toBe(true);
    expect(result.current.isSpotSaved('out')).toBe(false);
  });

  it('totalVisits sums across spots', async () => {
    (repo.getOurSpots as jest.Mock).mockResolvedValue([
      baseSpot({ placeId: 'a', visits: [{ date: 1 }, { date: 2 }] }),
      baseSpot({ placeId: 'b', visits: [{ date: 3 }] }),
    ]);
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.totalVisits).toBe(3));
  });
});

describe('useOurSpots — getSuggestion (Pick for Me)', () => {
  const sf = { lat: 37.7749, lng: -122.4194 };

  it('returns null when no spots are eligible', async () => {
    (repo.getOurSpots as jest.Mock).mockResolvedValue([]);
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getSuggestion(sf.lat, sf.lng)).toBeNull();
  });

  it('excludes spots farther than 30km from home', async () => {
    (repo.getOurSpots as jest.Mock).mockResolvedValue([
      // ~600km away in Los Angeles area
      baseSpot({ placeId: 'far', lat: 34.05, lng: -118.24, visits: [] }),
    ]);
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getSuggestion(sf.lat, sf.lng)).toBeNull();
  });

  it('excludes spots visited in the last 7 days', async () => {
    const now = Date.now();
    (repo.getOurSpots as jest.Mock).mockResolvedValue([
      baseSpot({
        placeId: 'recent',
        visits: [{ date: now - 2 * 24 * 60 * 60 * 1000 }],
      }),
    ]);
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getSuggestion(sf.lat, sf.lng)).toBeNull();
  });

  it('returns a suggestion with PickReason for an eligible spot', async () => {
    const now = Date.now();
    (repo.getOurSpots as jest.Mock).mockResolvedValue([
      baseSpot({
        placeId: 'eligible',
        familyRating: 5,
        visits: [{ date: now - 30 * 24 * 60 * 60 * 1000 }], // 30 days ago
      }),
    ]);
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const suggestion = result.current.getSuggestion(sf.lat, sf.lng);
    expect(suggestion).not.toBeNull();
    expect(suggestion!.spot.placeId).toBe('eligible');
    expect(suggestion!.reason.familyRating).toBe(5);
    expect(suggestion!.reason.neverTried).toBe(false);
    expect(suggestion!.reason.daysSinceLastVisit).toBeGreaterThan(28);
    expect(suggestion!.reason.daysSinceLastVisit).toBeLessThan(32);
  });

  it('flags neverTried=true when an eligible spot has no visits', async () => {
    (repo.getOurSpots as jest.Mock).mockResolvedValue([
      baseSpot({ placeId: 'untried', visits: [] }),
    ]);
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const suggestion = result.current.getSuggestion(sf.lat, sf.lng);
    expect(suggestion!.reason.neverTried).toBe(true);
    expect(suggestion!.reason.daysSinceLastVisit).toBeNull();
  });
});

describe('useOurSpots — getEligibleForWheel', () => {
  const sf = { lat: 37.7749, lng: -122.4194 };

  it('includes recently-visited spots (no recency filter on the wheel)', async () => {
    const now = Date.now();
    (repo.getOurSpots as jest.Mock).mockResolvedValue([
      baseSpot({ placeId: 'recent', visits: [{ date: now - 1 * 24 * 60 * 60 * 1000 }] }),
    ]);
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const eligible = result.current.getEligibleForWheel(sf.lat, sf.lng);
    expect(eligible.map((s: any) => s.placeId)).toEqual(['recent']);
  });

  it('caps at 12 spots even when more are within range', async () => {
    const spots = Array.from({ length: 20 }, (_, i) =>
      baseSpot({ placeId: `p${i}`, name: `Spot ${i}` })
    );
    (repo.getOurSpots as jest.Mock).mockResolvedValue(spots);
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const eligible = result.current.getEligibleForWheel(sf.lat, sf.lng);
    expect(eligible).toHaveLength(12);
  });

  it('filters by distance when home is provided', async () => {
    (repo.getOurSpots as jest.Mock).mockResolvedValue([
      baseSpot({ placeId: 'near' }),
      baseSpot({ placeId: 'far', lat: 34.05, lng: -118.24 }),
    ]);
    const { result } = renderHook(() => useOurSpots());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const eligible = result.current.getEligibleForWheel(sf.lat, sf.lng);
    expect(eligible.map((s: any) => s.placeId)).toEqual(['near']);
  });
});

describe('formatPickReason', () => {
  it('formats a never-tried reason with rating', () => {
    expect(
      formatPickReason({
        daysSinceLastVisit: null,
        familyRating: 5,
        cuisineMatchesRecent: false,
        neverTried: true,
      })
    ).toContain("Haven't tried this yet");
  });

  it('formats days since last visit when < 14', () => {
    expect(
      formatPickReason({
        daysSinceLastVisit: 5,
        familyRating: 4,
        cuisineMatchesRecent: false,
        neverTried: false,
      })
    ).toContain("Haven't been in 5 days");
  });

  it('formats weeks for 14-60 day windows', () => {
    expect(
      formatPickReason({
        daysSinceLastVisit: 21,
        familyRating: 3,
        cuisineMatchesRecent: true,
        neverTried: false,
      })
    ).toContain('Haven\'t been in 3 weeks');
  });

  it('formats months past 60 days', () => {
    expect(
      formatPickReason({
        daysSinceLastVisit: 95,
        familyRating: 4,
        cuisineMatchesRecent: false,
        neverTried: false,
      })
    ).toContain('months');
  });
});
