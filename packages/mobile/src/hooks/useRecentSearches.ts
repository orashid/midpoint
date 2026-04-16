import { useState, useEffect, useCallback } from 'react';
import { RecentSearch } from '../storage/types';
import { getRecentSearches, saveRecentSearch, togglePinSearch, deleteRecentSearch } from '../storage/repository';

export function useRecentSearches() {
  const [searches, setSearches] = useState<RecentSearch[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getRecentSearches().then((s) => {
      setSearches(s);
      setLoaded(true);
    });
  }, []);

  const addSearch = useCallback(
    async (search: Omit<RecentSearch, 'id' | 'timestamp' | 'pinned'>) => {
      await saveRecentSearch(search);
      const updated = await getRecentSearches();
      setSearches(updated);
    },
    []
  );

  const togglePin = useCallback(async (id: string) => {
    await togglePinSearch(id);
    const updated = await getRecentSearches();
    setSearches(updated);
  }, []);

  const removeSearch = useCallback(async (id: string) => {
    await deleteRecentSearch(id);
    const updated = await getRecentSearches();
    setSearches(updated);
  }, []);

  return { searches, loaded, addSearch, togglePin, removeSearch };
}
