export type MealType = 'coffee' | 'lunch' | 'dinner';

export interface CachedPerson {
  name: string;
  address: string;
  lat: number;
  lng: number;
  useCount: number;
  lastUsed: number;
}

export interface RecentSearch {
  id: string;
  participants: Array<{ name: string; address: string; lat: number; lng: number }>;
  mealType: MealType;
  dietaryRestrictions: string[];
  cuisineExclusions: string[];
  timestamp: number;
  pinned: boolean;
}

export interface UserPreferences {
  mealType: MealType;
  dietaryRestrictions: string[];
  cuisineExclusions: string[];
}

export interface MyInfo {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface SavedRestaurant {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  cuisineType: string;
  familyRating: number;
  visits: Array<{ date: number }>;
  dateAdded: number;
  photoUrl?: string;
}

export const CUISINE_TYPES = [
  'chinese', 'indian', 'mexican', 'italian', 'japanese',
  'thai', 'korean', 'vietnamese', 'mediterranean', 'american', 'other',
] as const;
