import { useState, useCallback } from 'react';
import { search as apiSearch, SearchResponse } from '../api/client';
import { MealType } from '../storage/types';

interface SearchState {
  loading: boolean;
  results: SearchResponse | null;
  error: string | null;
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    loading: false,
    results: null,
    error: null,
  });

  const performSearch = useCallback(
    async (params: {
      participants: Array<{ name: string; lat: number; lng: number; address: string }>;
      mealType: MealType;
      dietaryRestrictions?: string[];
      cuisineExclusions?: string[];
    }) => {
      setState({ loading: true, results: null, error: null });
      try {
        const results = await apiSearch(params);
        if (results.restaurants.length === 0) {
          setState({ loading: false, results, error: 'No spots found — try adjusting your filters or locations.' });
        } else {
          setState({ loading: false, results, error: null });
        }
        return results;
      } catch (err: any) {
        const message = err.response?.data?.error || err.message || 'Something went wrong';
        setState({ loading: false, results: null, error: message });
        return null;
      }
    },
    []
  );

  const clearResults = useCallback(() => {
    setState({ loading: false, results: null, error: null });
  }, []);

  return { ...state, performSearch, clearResults };
}
