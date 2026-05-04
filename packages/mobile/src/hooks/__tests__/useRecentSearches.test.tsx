import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('../../storage/repository', () => ({
  getRecentSearches: jest.fn(),
  saveRecentSearch: jest.fn(),
  togglePinSearch: jest.fn(),
  deleteRecentSearch: jest.fn(),
}));

import * as repo from '../../storage/repository';
import { useRecentSearches } from '../useRecentSearches';

beforeEach(() => {
  jest.clearAllMocks();
  (repo.getRecentSearches as jest.Mock).mockResolvedValue([]);
});

describe('useRecentSearches', () => {
  it('loads searches on mount and flips loaded=true', async () => {
    (repo.getRecentSearches as jest.Mock).mockResolvedValue([
      { id: 's1', timestamp: 100, pinned: false } as any,
    ]);
    const { result } = renderHook(() => useRecentSearches());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.searches).toHaveLength(1);
  });

  it('addSearch delegates to repository and re-pulls the list', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    (repo.getRecentSearches as jest.Mock).mockResolvedValue([
      { id: 'new', timestamp: 200, pinned: false } as any,
    ]);
    await act(async () => {
      await result.current.addSearch({} as any);
    });

    expect(repo.saveRecentSearch).toHaveBeenCalled();
    expect(result.current.searches[0].id).toBe('new');
  });

  it('togglePin delegates and refreshes', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.togglePin('s1');
    });
    expect(repo.togglePinSearch).toHaveBeenCalledWith('s1');
  });

  it('removeSearch delegates and refreshes', async () => {
    const { result } = renderHook(() => useRecentSearches());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.removeSearch('s1');
    });
    expect(repo.deleteRecentSearch).toHaveBeenCalledWith('s1');
  });
});
