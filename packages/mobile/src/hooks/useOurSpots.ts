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
const RECENT_VISIT_DAYS = 7;
const CUISINE_WINDOW_VISITS = 3;
const NEVER_TRIED_BOOST = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PickReason {
  daysSinceLastVisit: number | null;
  familyRating: number;
  cuisineMatchesRecent: boolean;
  neverTried: boolean;
}

export interface SuggestionResult {
  spot: SavedRestaurant;
  reason: PickReason;
}

function getLastVisit(spot: SavedRestaurant): number {
  return spot.visits.length > 0 ? Math.max(...spot.visits.map((v) => v.date)) : 0;
}

// Last N visits across all spots, each tagged with the spot's cuisine.
function recentCuisines(spots: SavedRestaurant[], n: number): string[] {
  const all: Array<{ date: number; cuisine: string }> = [];
  for (const s of spots) {
    for (const v of s.visits) {
      all.push({ date: v.date, cuisine: s.cuisineType });
    }
  }
  return all.sort((a, b) => b.date - a.date).slice(0, n).map((v) => v.cuisine);
}

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
    async (placeId: string, visitDate: number, visitId?: string) => {
      await removeVisitFromStorage(placeId, visitDate, visitId);
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

  // "Pick for me" eligibility: close enough, and not visited in last 7 days.
  const getEligible = useCallback(
    (homeLat?: number, homeLng?: number) => {
      const now = Date.now();
      const cutoff = now - RECENT_VISIT_DAYS * DAY_MS;
      return spots.filter((s) => {
        if (homeLat !== undefined && homeLng !== undefined) {
          const dist = haversineDistance(homeLat, homeLng, s.lat, s.lng);
          if (dist > MAX_DISTANCE_KM) return false;
        }
        return getLastVisit(s) < cutoff;
      });
    },
    [spots]
  );

  const getSuggestion = useCallback(
    (homeLat?: number, homeLng?: number): SuggestionResult | null => {
      const eligible = getEligible(homeLat, homeLng);
      if (eligible.length === 0) return null;

      const now = Date.now();
      const recent = recentCuisines(spots, CUISINE_WINDOW_VISITS);
      const mostRecent = recent[0];

      const cuisineBonusFor = (cuisine: string) => {
        if (cuisine === mostRecent) return 0.1;
        if (recent.slice(1).includes(cuisine)) return 0.4;
        return 1;
      };

      const scored = eligible.map((s) => {
        const lastVisit = getLastVisit(s);
        const neverTried = lastVisit === 0;
        const cuisineBonus = cuisineBonusFor(s.cuisineType);

        let score: number;
        if (neverTried) {
          // No visit log — use rating + "saved but untried" bump. Still apply
          // cuisine rotation so we don't push e.g. Italian when the last 3
          // visits were all Italian even if the candidate is unvisited.
          score = s.familyRating * NEVER_TRIED_BOOST * cuisineBonus;
        } else {
          const daysSince = (now - lastVisit) / DAY_MS;
          const recencyBonus = Math.max(1, Math.min(daysSince / 7, 5));
          score = s.familyRating * recencyBonus * cuisineBonus;
        }
        return { spot: s, score };
      });

      const totalWeight = scored.reduce((sum, x) => sum + x.score, 0);
      if (totalWeight <= 0) return null;

      let r = Math.random() * totalWeight;
      let pick = scored[scored.length - 1];
      for (const x of scored) {
        r -= x.score;
        if (r <= 0) { pick = x; break; }
      }

      const lastVisit = getLastVisit(pick.spot);
      const daysSinceLastVisit = lastVisit === 0 ? null : (now - lastVisit) / DAY_MS;
      const reason: PickReason = {
        daysSinceLastVisit,
        familyRating: pick.spot.familyRating,
        cuisineMatchesRecent: recent.includes(pick.spot.cuisineType),
        neverTried: lastVisit === 0,
      };
      return { spot: pick.spot, reason };
    },
    [getEligible, spots]
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

// Build a human one-line reason from the pick-reason signals.
export function formatPickReason(r: PickReason): string {
  const parts: string[] = [];
  if (r.neverTried) {
    parts.push("Haven't tried this yet");
  } else if (r.daysSinceLastVisit !== null) {
    const d = r.daysSinceLastVisit;
    if (d < 14) parts.push(`Haven't been in ${Math.round(d)} days`);
    else if (d < 60) parts.push(`Haven't been in ${Math.round(d / 7)} weeks`);
    else parts.push(`Haven't been in ${Math.round(d / 30)} months`);
  }
  if (r.familyRating >= 4) parts.push(`${r.familyRating}\u2605`);
  if (!r.cuisineMatchesRecent && !r.neverTried) {
    parts.push('different from your recent meals');
  }
  return parts.join(' \u00b7 ');
}
