/**
 * Storage abstraction layer.
 * When authenticated: calls the server API (source of truth) and caches locally.
 * When offline or unauthenticated: falls back to AsyncStorage.
 */
import { isAuthenticated } from '../api/client';
import * as api from '../api/userData';
import * as cache from './cache';
import { SavedRestaurant, CachedPerson, RecentSearch, UserPreferences, MyInfo } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@midpoint/';

async function cacheWrite(key: string, data: any) {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
  } catch {
    // Silently fail cache writes
  }
}

// ── Our Spots ──

export async function getOurSpots(): Promise<SavedRestaurant[]> {
  if (isAuthenticated()) {
    try {
      const spots = await api.fetchSpots();
      await cacheWrite('ourSpots', spots);
      return spots.sort((a: any, b: any) => b.dateAdded - a.dateAdded);
    } catch {
      // Offline fallback
      return cache.getOurSpots();
    }
  }
  return cache.getOurSpots();
}

export async function saveSpot(spot: Omit<SavedRestaurant, 'visits' | 'dateAdded'>) {
  if (isAuthenticated()) {
    try {
      await api.createSpot(spot);
      return;
    } catch {
      // Fall through to local
    }
  }
  await cache.saveSpot(spot);
}

export async function removeSpot(placeId: string) {
  if (isAuthenticated()) {
    try {
      await api.deleteSpot(placeId);
      return;
    } catch {
      // Fall through to local
    }
  }
  await cache.removeSpot(placeId);
}

export async function updateSpotRating(placeId: string, rating: number) {
  if (isAuthenticated()) {
    try {
      await api.updateSpotRating(placeId, rating);
      return;
    } catch {
      // Fall through to local
    }
  }
  await cache.updateSpotRating(placeId, rating);
}

export async function updateSpotCuisine(placeId: string, cuisineType: string) {
  if (isAuthenticated()) {
    try {
      await api.updateSpotCuisine(placeId, cuisineType);
      return;
    } catch {
      // Fall through to local
    }
  }
  await cache.updateSpotCuisine(placeId, cuisineType);
}

export async function logVisit(placeId: string, date?: number) {
  if (isAuthenticated()) {
    try {
      await api.logVisit(placeId, date);
      return;
    } catch {
      // Fall through to local
    }
  }
  await cache.logVisit(placeId, date);
}

export async function removeVisit(placeId: string, visitDate: number, visitId?: string) {
  if (isAuthenticated() && visitId) {
    try {
      await api.removeVisit(placeId, visitId);
      return;
    } catch {
      // Fall through to local
    }
  }
  await cache.removeVisit(placeId, visitDate);
}

// ── People ──

export async function getSavedPeople(): Promise<CachedPerson[]> {
  if (isAuthenticated()) {
    try {
      const people = await api.fetchPeople();
      await cacheWrite('people', people);
      return people.sort((a: any, b: any) => b.useCount - a.useCount);
    } catch {
      return cache.getSavedPeople();
    }
  }
  return cache.getSavedPeople();
}

export async function savePerson(person: Omit<CachedPerson, 'useCount' | 'lastUsed'>) {
  if (isAuthenticated()) {
    try {
      await api.upsertPerson(person);
      return;
    } catch {
      // Fall through
    }
  }
  await cache.savePerson(person);
}

export async function saveAllParticipants(
  participants: Array<{ name: string; address: string; lat: number; lng: number }>
) {
  if (isAuthenticated()) {
    try {
      await api.upsertPeopleBatch(participants);
      return;
    } catch {
      // Fall through
    }
  }
  await cache.saveAllParticipants(participants);
}

export async function deleteSavedPerson(name: string, address: string) {
  if (isAuthenticated()) {
    try {
      await api.deletePerson(name, address);
      return;
    } catch {
      // Fall through
    }
  }
  await cache.deleteSavedPerson(name, address);
}

// ── Searches ──

export async function getRecentSearches(): Promise<RecentSearch[]> {
  if (isAuthenticated()) {
    try {
      const searches = await api.fetchSearches();
      await cacheWrite('searches', searches);
      return searches;
    } catch {
      return cache.getRecentSearches();
    }
  }
  return cache.getRecentSearches();
}

export async function saveRecentSearch(search: Omit<RecentSearch, 'id' | 'timestamp' | 'pinned'>) {
  if (isAuthenticated()) {
    try {
      await api.saveSearch(search);
      return;
    } catch {
      // Fall through
    }
  }
  await cache.saveRecentSearch(search);
}

export async function togglePinSearch(id: string) {
  if (isAuthenticated()) {
    try {
      await api.togglePinSearch(id);
      return;
    } catch {
      // Fall through
    }
  }
  await cache.togglePinSearch(id);
}

export async function deleteRecentSearch(id: string) {
  if (isAuthenticated()) {
    try {
      await api.deleteSearch(id);
      return;
    } catch {
      // Fall through
    }
  }
  await cache.deleteRecentSearch(id);
}

// ── Preferences ──

export async function getPreferences(): Promise<UserPreferences | null> {
  if (isAuthenticated()) {
    try {
      const data = await api.fetchPreferences();
      const prefs: UserPreferences = {
        mealType: data.mealType as any,
        dietaryRestrictions: data.dietaryRestrictions,
        cuisineExclusions: data.cuisineExclusions,
      };
      await cacheWrite('preferences', prefs);
      return prefs;
    } catch {
      return cache.getPreferences();
    }
  }
  return cache.getPreferences();
}

export async function savePreferences(prefs: UserPreferences) {
  if (isAuthenticated()) {
    try {
      await api.savePreferences(prefs);
      return;
    } catch {
      // Fall through
    }
  }
  await cache.savePreferences(prefs);
}

// ── My Info ──

export async function getMyInfo(): Promise<MyInfo | null> {
  if (isAuthenticated()) {
    try {
      const data = await api.fetchPreferences();
      if (data.myInfo) {
        await cacheWrite('myInfo', data.myInfo);
      }
      return data.myInfo;
    } catch {
      return cache.getMyInfo();
    }
  }
  return cache.getMyInfo();
}

export async function saveMyInfo(info: MyInfo) {
  if (isAuthenticated()) {
    try {
      await api.saveMyInfo(info);
      return;
    } catch {
      // Fall through
    }
  }
  await cache.saveMyInfo(info);
}
