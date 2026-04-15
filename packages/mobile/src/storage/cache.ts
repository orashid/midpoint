import AsyncStorage from '@react-native-async-storage/async-storage';
import { CachedPerson, RecentSearch, UserPreferences, MyInfo } from './types';

const KEYS = {
  people: '@midpoint/people',
  searches: '@midpoint/searches',
  preferences: '@midpoint/preferences',
  myInfo: '@midpoint/myInfo',
};

// ── Favorite People ──

export async function getSavedPeople(): Promise<CachedPerson[]> {
  const raw = await AsyncStorage.getItem(KEYS.people);
  if (!raw) return [];
  const people: CachedPerson[] = JSON.parse(raw);
  return people.sort((a, b) => b.useCount - a.useCount);
}

export async function savePerson(person: Omit<CachedPerson, 'useCount' | 'lastUsed'>) {
  const people = await getSavedPeople();
  const existing = people.find(
    (p) => p.name.toLowerCase() === person.name.toLowerCase() && p.address === person.address
  );
  if (existing) {
    existing.useCount++;
    existing.lastUsed = Date.now();
  } else {
    people.push({ ...person, useCount: 1, lastUsed: Date.now() });
  }
  await AsyncStorage.setItem(KEYS.people, JSON.stringify(people));
}

export async function saveAllParticipants(
  participants: Array<{ name: string; address: string; lat: number; lng: number }>
) {
  for (const p of participants) {
    await savePerson(p);
  }
}

// ── Recent Searches ──

export async function getRecentSearches(): Promise<RecentSearch[]> {
  const raw = await AsyncStorage.getItem(KEYS.searches);
  if (!raw) return [];
  const searches: RecentSearch[] = JSON.parse(raw);
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
    existing.cuisineExclusions = search.cuisineExclusions;
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
  const searches: RecentSearch[] = JSON.parse(raw);
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
  const filtered = people.filter(
    (p) => !(p.name.toLowerCase() === name.toLowerCase() && p.address === address)
  );
  await AsyncStorage.setItem(KEYS.people, JSON.stringify(filtered));
}

// ── Preferences ──

export async function getPreferences(): Promise<UserPreferences | null> {
  const raw = await AsyncStorage.getItem(KEYS.preferences);
  return raw ? JSON.parse(raw) : null;
}

export async function savePreferences(prefs: UserPreferences) {
  await AsyncStorage.setItem(KEYS.preferences, JSON.stringify(prefs));
}

// ── My Info ──

export async function getMyInfo(): Promise<MyInfo | null> {
  const raw = await AsyncStorage.getItem(KEYS.myInfo);
  return raw ? JSON.parse(raw) : null;
}

export async function saveMyInfo(info: MyInfo) {
  await AsyncStorage.setItem(KEYS.myInfo, JSON.stringify(info));
}
