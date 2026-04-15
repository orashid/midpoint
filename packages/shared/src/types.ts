export type MealType = 'coffee' | 'lunch' | 'dinner';

export interface Participant {
  name: string;
  lat: number;
  lng: number;
  address: string;
}

export interface SearchRequest {
  participants: Participant[];
  mealType: MealType;
  dietaryRestrictions?: string[];
  cuisineExclusions?: string[];
}

export interface ParticipantDistance {
  participantName: string;
  distanceText: string;
  durationText: string;
  durationMinutes: number;
}

export interface Restaurant {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  priceLevel: number;
  photoUrl: string | null;
  types: string[];
  distancesFromParticipants: ParticipantDistance[];
}

export interface SearchResponse {
  midpoint: { lat: number; lng: number };
  restaurants: Restaurant[];
}

export interface AutocompleteResult {
  placeId: string;
  description: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}
