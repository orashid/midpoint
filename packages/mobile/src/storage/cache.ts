import AsyncStorage from '@react-native-async-storage/async-storage';
import { CachedPerson, RecentSearch, UserPreferences, MyInfo, SavedRestaurant } from './types';

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const KEYS = {
  people: '@midpoint/people',
  searches: '@midpoint/searches',
  preferences: '@midpoint/preferences',
  myInfo: '@midpoint/myInfo',
  ourSpots: '@midpoint/ourSpots',
};

// ── Favorite People ──

// Normalize an address for dedup: lowercase, trim, strip trailing country /
// postal-ish junk that geocoders flip between runs. "123 Main St, San
// Francisco, CA" and "123 Main St, San Francisco, California, USA" should
// collapse to the same key.
function normalizeAddress(addr: string): string {
  return addr
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    // Strip trailing country suffix.
    .replace(/,?\s*(usa|united states|u\.s\.a?\.?)\s*$/i, '')
    // Strip a trailing ZIP (5 or 9 digit) that follows a state abbrev — only
    // at end-of-string, to avoid eating a street number like "500 Main St".
    .replace(/,?\s+[a-z]{2}\s+\d{5}(-\d{4})?\s*$/i, '')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

function personKey(p: { name: string; address: string; placeId?: string }): string {
  if (p.placeId) return `pid:${p.placeId}`;
  return `nm:${p.name.trim().toLowerCase()}|addr:${normalizeAddress(p.address)}`;
}

// Merge any entries in the list that share a dedup key. Keeps the highest
// useCount, latest lastUsed, and promotes placeId if any variant has one.
export function dedupPeople(people: CachedPerson[]): CachedPerson[] {
  const byKey = new Map<string, CachedPerson>();
  for (const p of people) {
    const key = personKey(p);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...p });
    } else {
      existing.useCount = (existing.useCount || 0) + (p.useCount || 0);
      existing.lastUsed = Math.max(existing.lastUsed || 0, p.lastUsed || 0);
      if (!existing.placeId && p.placeId) existing.placeId = p.placeId;
    }
  }
  return [...byKey.values()];
}

export async function getSavedPeople(): Promise<CachedPerson[]> {
  const raw = await AsyncStorage.getItem(KEYS.people);
  if (!raw) return [];
  const people: CachedPerson[] = safeParse(raw, []);
  const merged = dedupPeople(people);
  if (merged.length !== people.length) {
    // Persist the cleaned-up list so legacy duplicates collapse on next read.
    await AsyncStorage.setItem(KEYS.people, JSON.stringify(merged));
  }
  return merged.sort((a, b) => b.useCount - a.useCount);
}

export async function savePerson(person: Omit<CachedPerson, 'useCount' | 'lastUsed'>) {
  const people = await getSavedPeople();
  const key = personKey(person);
  const existing = people.find((p) => personKey(p) === key);
  if (existing) {
    existing.useCount++;
    existing.lastUsed = Date.now();
    if (!existing.placeId && person.placeId) existing.placeId = person.placeId;
  } else {
    people.push({ ...person, useCount: 1, lastUsed: Date.now() });
  }
  await AsyncStorage.setItem(KEYS.people, JSON.stringify(people));
}

export async function saveAllParticipants(
  participants: Array<{ name: string; address: string; placeId?: string; lat: number; lng: number }>
) {
  for (const p of participants) {
    await savePerson(p);
  }
}

// ── Recent Searches ──

export async function getRecentSearches(): Promise<RecentSearch[]> {
  const raw = await AsyncStorage.getItem(KEYS.searches);
  if (!raw) return [];
  const searches: RecentSearch[] = safeParse(raw, []);
  // Ensure every entry has a string id
  for (const s of searches) {
    if (!s.id) s.id = String(s.timestamp || Date.now());
    else s.id = String(s.id);
  }
  // Pinned first, then by timestamp
  return searches.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.timestamp - a.timestamp;
  });
}

export async function saveRecentSearch(search: Omit<RecentSearch, 'id' | 'timestamp' | 'pinned'>) {
  const searches = await getRecentSearches();

  // Check if a search with the same group of people already exists
  const participantKey = (participants: Array<{ name: string; address: string }>) =>
    participants.map((p) => p.name.toLowerCase() + '|' + p.address.toLowerCase()).sort().join('::');

  const newKey = participantKey(search.participants);
  const existingIndex = searches.findIndex((s) => participantKey(s.participants) === newKey);

  if (existingIndex !== -1) {
    // Update existing entry with new search params and timestamp
    const existing = searches[existingIndex];
    existing.mealType = search.mealType;
    existing.dietaryRestrictions = search.dietaryRestrictions;
    existing.cuisineInclusions = search.cuisineInclusions;
    existing.brandQuery = search.brandQuery;
    existing.participants = search.participants;
    existing.timestamp = Date.now();
    // Move to front
    searches.splice(existingIndex, 1);
    searches.unshift(existing);
  } else {
    const newSearch: RecentSearch = {
      ...search,
      id: Date.now().toString(),
      timestamp: Date.now(),
      pinned: false,
    };
    searches.unshift(newSearch);
  }

  // Keep max 10
  const toKeep = searches.filter((s) => s.pinned).concat(searches.filter((s) => !s.pinned)).slice(0, 10);
  await AsyncStorage.setItem(KEYS.searches, JSON.stringify(toKeep));
}

export async function togglePinSearch(id: string) {
  const searches = await getRecentSearches();
  const search = searches.find((s) => s.id === id);
  if (search) {
    search.pinned = !search.pinned;
    await AsyncStorage.setItem(KEYS.searches, JSON.stringify(searches));
  }
}

export async function deleteRecentSearch(id: string) {
  const raw = await AsyncStorage.getItem(KEYS.searches);
  if (!raw) return;
  const searches: RecentSearch[] = safeParse(raw, []);
  const before = searches.length;
  const filtered = searches.filter((s) => {
    // Match by id or by timestamp (id is generated from Date.now())
    return String(s.id) !== String(id) && String(s.timestamp) !== String(id);
  });
  // If nothing was filtered, try removing by index-based match
  if (filtered.length === before) {
    // Last resort: remove the first entry whose id loosely matches
    const idx = searches.findIndex((s) => s.id == id);
    if (idx !== -1) searches.splice(idx, 1);
    await AsyncStorage.setItem(KEYS.searches, JSON.stringify(searches));
  } else {
    await AsyncStorage.setItem(KEYS.searches, JSON.stringify(filtered));
  }
}

export async function deleteSavedPerson(name: string, address: string) {
  const people = await getSavedPeople();
  const targetKey = personKey({ name, address });
  const filtered = people.filter((p) => personKey(p) !== targetKey);
  await AsyncStorage.setItem(KEYS.people, JSON.stringify(filtered));
}

// ── Preferences ──

export async function getPreferences(): Promise<UserPreferences | null> {
  const raw = await AsyncStorage.getItem(KEYS.preferences);
  return raw ? safeParse<UserPreferences | null>(raw, null) : null;
}

export async function savePreferences(prefs: UserPreferences) {
  await AsyncStorage.setItem(KEYS.preferences, JSON.stringify(prefs));
}

// ── My Info ──

export async function getMyInfo(): Promise<MyInfo | null> {
  const raw = await AsyncStorage.getItem(KEYS.myInfo);
  return raw ? safeParse<MyInfo | null>(raw, null) : null;
}

export async function saveMyInfo(info: MyInfo) {
  await AsyncStorage.setItem(KEYS.myInfo, JSON.stringify(info));
}

// ── Our Spots ──

export async function getOurSpots(): Promise<SavedRestaurant[]> {
  const raw = await AsyncStorage.getItem(KEYS.ourSpots);
  if (!raw) return [];
  const spots: SavedRestaurant[] = safeParse(raw, []);
  return spots.sort((a, b) => b.dateAdded - a.dateAdded);
}

export async function saveSpot(
  spot: Omit<SavedRestaurant, 'visits' | 'dateAdded'>
) {
  const spots = await getOurSpots();
  const existing = spots.find((s) => s.placeId === spot.placeId);
  if (existing) {
    existing.familyRating = spot.familyRating;
    existing.cuisineType = spot.cuisineType;
    if (spot.photoUrl) existing.photoUrl = spot.photoUrl;
    if (spot.phone) existing.phone = spot.phone;
  } else {
    spots.push({ ...spot, visits: [], dateAdded: Date.now() });
  }
  await AsyncStorage.setItem(KEYS.ourSpots, JSON.stringify(spots));
}

export async function removeSpot(placeId: string) {
  const spots = await getOurSpots();
  const filtered = spots.filter((s) => s.placeId !== placeId);
  await AsyncStorage.setItem(KEYS.ourSpots, JSON.stringify(filtered));
}

export async function updateSpotRating(placeId: string, rating: number) {
  const spots = await getOurSpots();
  const spot = spots.find((s) => s.placeId === placeId);
  if (spot) {
    spot.familyRating = rating;
    await AsyncStorage.setItem(KEYS.ourSpots, JSON.stringify(spots));
  }
}

export async function logVisit(placeId: string, date?: number) {
  const spots = await getOurSpots();
  const spot = spots.find((s) => s.placeId === placeId);
  if (spot) {
    spot.visits.push({ date: date ?? Date.now() });
    await AsyncStorage.setItem(KEYS.ourSpots, JSON.stringify(spots));
  }
}

export async function removeVisit(placeId: string, visitDate: number) {
  const spots = await getOurSpots();
  const spot = spots.find((s) => s.placeId === placeId);
  if (spot) {
    const idx = spot.visits.findIndex((v) => v.date === visitDate);
    if (idx !== -1) {
      spot.visits.splice(idx, 1);
      await AsyncStorage.setItem(KEYS.ourSpots, JSON.stringify(spots));
    }
  }
}

export async function updateSpotCuisine(placeId: string, cuisineType: string) {
  const spots = await getOurSpots();
  const spot = spots.find((s) => s.placeId === placeId);
  if (spot) {
    spot.cuisineType = cuisineType;
    await AsyncStorage.setItem(KEYS.ourSpots, JSON.stringify(spots));
  }
}
