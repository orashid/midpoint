import { useState, useEffect, useCallback } from 'react';
import { SavedRestaurant } from '../storage/types';
import {
  getOurSpots,
  saveSpot,
  removeSpot as removeSpotFromStorage,
  updateSpotRating,
  logVisit as logVisitToStorage,
  removeVisit as removeVisitFromStorage,
  updateSpotCuisine,
} from '../storage/repository';
import { haversineDistance } from '../utils/geo';

const MAX_DISTANCE_KM = 30;
const RECENT_VISIT_DAYS = 14;

export function useOurSpots() {
  const [spots, setSpots] = useState<SavedRestaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await getOurSpots();
    setSpots(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addSpot = useCallback(
    async (spot: Omit<SavedRestaurant, 'visits' | 'dateAdded'>) => {
      await saveSpot(spot);
      await refresh();
    },
    [refresh]
  );

  const removeSpot = useCallback(
    async (placeId: string) => {
      await removeSpotFromStorage(placeId);
      await refresh();
    },
    [refresh]
  );

  const updateRating = useCallback(
    async (placeId: string, rating: number) => {
      await updateSpotRating(placeId, rating);
      await refresh();
    },
    [refresh]
  );

  const logVisit = useCallback(
    async (placeId: string, date?: number) => {
      await logVisitToStorage(placeId, date);
      await refresh();
    },
    [refresh]
  );

  const removeVisit = useCallback(
    async (placeId: string, visitDate: number) => {
      await removeVisitFromStorage(placeId, visitDate);
      await refresh();
    },
    [refresh]
  );

  const updateCuisine = useCallback(
    async (placeId: string, cuisineType: string) => {
      await updateSpotCuisine(placeId, cuisineType);
      await refresh();
    },
    [refresh]
  );

  const isSpotSaved = useCallback(
    (placeId: string) => spots.some((s) => s.placeId === placeId),
    [spots]
  );

  const getEligible = useCallback(
    (homeLat?: number, homeLng?: number) => {
      const now = Date.now();
      const cutoff = now - RECENT_VISIT_DAYS * 24 * 60 * 60 * 1000;

      return spots.filter((s) => {
        // Distance filter
        if (homeLat !== undefined && homeLng !== undefined) {
          const dist = haversineDistance(homeLat, homeLng, s.lat, s.lng);
          if (dist > MAX_DISTANCE_KM) return false;
        }
        // Recency filter — exclude if visited in last 14 days
        const lastVisit = s.visits.length > 0
          ? Math.max(...s.visits.map((v) => v.date))
          : 0;
        return lastVisit < cutoff;
      });
    },
    [spots]
  );

  const getSuggestion = useCallback(
    (homeLat?: number, homeLng?: number): SavedRestaurant | null => {
      const eligible = getEligible(homeLat, homeLng);
      if (eligible.length === 0) return null;

      const now = Date.now();
      const weights = eligible.map((s) => {
        const lastVisit = s.visits.length > 0
          ? Math.max(...s.visits.map((v) => v.date))
          : 0;
        const daysSince = lastVisit > 0
          ? (now - lastVisit) / (24 * 60 * 60 * 1000)
          : 60; // never visited = high bonus
        const recencyBonus = Math.min(daysSince / 7, 5);
        return s.familyRating * recencyBonus;
      });

      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;
      for (let i = 0; i < eligible.length; i++) {
        random -= weights[i];
        if (random <= 0) return eligible[i];
      }
      return eligible[eligible.length - 1];
    },
    [getEligible]
  );

  const getEligibleForWheel = useCallback(
    (homeLat?: number, homeLng?: number): SavedRestaurant[] => {
      // Wheel includes ALL spots (no recency filter) — just distance filter
      let eligible = spots;
      if (homeLat !== undefined && homeLng !== undefined) {
        eligible = spots.filter((s) => {
          const dist = haversineDistance(homeLat, homeLng, s.lat, s.lng);
          return dist <= MAX_DISTANCE_KM;
        });
      }
      // Max 12 for wheel, randomly sample if more
      if (eligible.length <= 12) return eligible;
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 12);
    },
    [spots]
  );

  const totalVisits = spots.reduce((sum, s) => sum + s.visits.length, 0);

  return {
    spots,
    loading,
    addSpot,
    removeSpot,
    updateRating,
    logVisit,
    removeVisit,
    updateCuisine,
    isSpotSaved,
    getSuggestion,
    getEligibleForWheel,
    totalVisits,
    refresh,
  };
}
