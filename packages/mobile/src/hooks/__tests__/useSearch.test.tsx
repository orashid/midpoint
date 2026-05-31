import { renderHook, act } from '@testing-library/react-native';

jest.mock('../../api/client', () => ({
  search: jest.fn(),
}));

import * as apiClient from '../../api/client';
import { useSearch } from '../useSearch';

const mkParams = (over: any = {}) => ({
  participants: [{ name: 'A', address: '1', lat: 0, lng: 0 }],
  mealType: 'dinner' as const,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSearch', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.loading).toBe(false);
    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('flips loading=true mid-flight, then back to false on success with results', async () => {
    let resolve!: (v: any) => void;
    (apiClient.search as jest.Mock).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      })
    );

    const { result } = renderHook(() => useSearch());

    let promise!: Promise<any>;
    act(() => {
      promise = result.current.performSearch(mkParams());
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => {
      resolve({ midpoint: { lat: 0, lng: 0 }, restaurants: [{ placeId: 'r1' } as any] });
      await promise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.results?.restaurants).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('sets a friendly error message when the server returns zero results', async () => {
    (apiClient.search as jest.Mock).mockResolvedValue({
      midpoint: { lat: 0, lng: 0 },
      restaurants: [],
    });

    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.performSearch(mkParams());
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.results?.restaurants).toEqual([]);
    expect(result.current.error).toMatch(/No spots found/);
  });

  it('surfaces err.userMessage when the API throws a normalized ApiError', async () => {
    (apiClient.search as jest.Mock).mockRejectedValue({
      code: 'NETWORK',
      userMessage: "Couldn't reach Midpoint. Check your internet connection.",
    });

    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.performSearch(mkParams());
    });

    expect(result.current.error).toBe(
      "Couldn't reach Midpoint. Check your internet connection."
    );
    expect(result.current.results).toBeNull();
  });

  it('falls back to err.message when userMessage is missing', async () => {
    (apiClient.search as jest.Mock).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.performSearch(mkParams());
    });
    expect(result.current.error).toBe('boom');
  });

  it('clearResults resets state to idle', async () => {
    (apiClient.search as jest.Mock).mockResolvedValue({
      midpoint: { lat: 0, lng: 0 },
      restaurants: [{ placeId: 'r1' } as any],
    });

    const { result } = renderHook(() => useSearch());
    await act(async () => {
      await result.current.performSearch(mkParams());
    });
    expect(result.current.results).not.toBeNull();

    act(() => result.current.clearResults());
    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
