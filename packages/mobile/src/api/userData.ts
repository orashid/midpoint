import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';
import { SavedRestaurant, CachedPerson, RecentSearch, UserPreferences, MyInfo } from '../storage/types';

// ── Spots ──

export async function fetchSpots(): Promise<SavedRestaurant[]> {
  const data = await apiGet('/spots');
  return data;
}

export async function createSpot(spot: Omit<SavedRestaurant, 'visits' | 'dateAdded'>): Promise<SavedRestaurant> {
  return apiPost('/spots', spot);
}

export async function deleteSpot(placeId: string): Promise<void> {
  await apiDelete(`/spots/${encodeURIComponent(placeId)}`);
}

export async function updateSpotRating(placeId: string, rating: number): Promise<void> {
  await apiPatch(`/spots/${encodeURIComponent(placeId)}/rating`, { rating });
}

export async function updateSpotCuisine(placeId: string, cuisineType: string): Promise<void> {
  await apiPatch(`/spots/${encodeURIComponent(placeId)}/cuisine`, { cuisineType });
}

export async function logVisit(placeId: string, date?: number): Promise<{ id: string; date: number }> {
  return apiPost(`/spots/${encodeURIComponent(placeId)}/visits`, { date });
}

export async function removeVisit(placeId: string, visitId: string): Promise<void> {
  await apiDelete(`/spots/${encodeURIComponent(placeId)}/visits/${visitId}`);
}

// ── People ──

export async function fetchPeople(): Promise<CachedPerson[]> {
  return apiGet('/people');
}

export async function upsertPerson(person: { name: string; address: string; lat: number; lng: number }): Promise<void> {
  await apiPost('/people', person);
}

export async function upsertPeopleBatch(participants: Array<{ name: string; address: string; lat: number; lng: number }>): Promise<void> {
  await apiPost('/people/batch', { participants });
}

export async function deletePerson(name: string, address: string): Promise<void> {
  await apiDelete('/people', { name, address });
}

// ── Searches ──

export async function fetchSearches(): Promise<RecentSearch[]> {
  return apiGet('/searches');
}

export async function saveSearch(search: Omit<RecentSearch, 'id' | 'timestamp' | 'pinned'>): Promise<void> {
  await apiPost('/searches', search);
}

export async function togglePinSearch(id: string): Promise<{ pinned: boolean }> {
  return apiPatch(`/searches/${id}/pin`, {});
}

export async function deleteSearch(id: string): Promise<void> {
  await apiDelete(`/searches/${id}`);
}

// ── Preferences ──

export async function fetchPreferences(): Promise<{ mealType: string; dietaryRestrictions: string[]; cuisineInclusions: string[]; myInfo: MyInfo | null }> {
  return apiGet('/preferences');
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  await apiPut('/preferences', prefs);
}

export async function fetchMyInfo(): Promise<MyInfo | null> {
  return apiGet('/me/info');
}

export async function saveMyInfo(info: MyInfo): Promise<void> {
  await apiPut('/me/info', info);
}

// ── Migration ──

export async function migrateLocalData(payload: {
  spots?: SavedRestaurant[];
  people?: CachedPerson[];
  searches?: RecentSearch[];
  preferences?: UserPreferences | null;
  myInfo?: MyInfo | null;
}): Promise<void> {
  await apiPost('/migrate', payload);
}
