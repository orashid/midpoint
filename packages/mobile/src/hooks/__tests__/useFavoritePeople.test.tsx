import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('../../storage/repository', () => ({
  getSavedPeople: jest.fn(),
  saveAllParticipants: jest.fn(),
  deleteSavedPerson: jest.fn(),
}));

import * as repo from '../../storage/repository';
import { useFavoritePeople } from '../useFavoritePeople';

beforeEach(() => {
  jest.clearAllMocks();
  (repo.getSavedPeople as jest.Mock).mockResolvedValue([]);
});

describe('useFavoritePeople', () => {
  it('loads saved people on mount', async () => {
    (repo.getSavedPeople as jest.Mock).mockResolvedValue([
      { name: 'Alice', address: '1 Main', useCount: 3, lastUsed: 0, lat: 0, lng: 0 },
    ]);

    const { result } = renderHook(() => useFavoritePeople());
    await waitFor(() => expect(result.current.people).toHaveLength(1));
    expect(result.current.people[0].name).toBe('Alice');
  });

  it('saveParticipants delegates to repository.saveAllParticipants and refreshes', async () => {
    const { result } = renderHook(() => useFavoritePeople());
    await waitFor(() => expect(result.current.people).toEqual([]));

    (repo.getSavedPeople as jest.Mock).mockResolvedValue([
      { name: 'A', address: '1', useCount: 1, lastUsed: 0, lat: 0, lng: 0 },
    ]);
    await act(async () => {
      await result.current.saveParticipants([
        { name: 'A', address: '1', lat: 0, lng: 0 },
      ]);
    });

    expect(repo.saveAllParticipants).toHaveBeenCalled();
    expect(result.current.people).toHaveLength(1);
  });

  it('removePerson delegates and refreshes', async () => {
    (repo.getSavedPeople as jest.Mock).mockResolvedValue([
      { name: 'X', address: '1', useCount: 1, lastUsed: 0, lat: 0, lng: 0 },
    ]);
    const { result } = renderHook(() => useFavoritePeople());
    await waitFor(() => expect(result.current.people).toHaveLength(1));

    (repo.getSavedPeople as jest.Mock).mockResolvedValue([]);
    await act(async () => {
      await result.current.removePerson('X', '1');
    });

    expect(repo.deleteSavedPerson).toHaveBeenCalledWith('X', '1');
    expect(result.current.people).toEqual([]);
  });
});
