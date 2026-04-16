import axios from 'axios';

const BASE_URL = 'https://midpoint-production-749a.up.railway.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

export interface AutocompleteResult {
  placeId: string;
  description: string;
}

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
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

export async function autocomplete(input: string, sessiontoken?: string): Promise<AutocompleteResult[]> {
  const params: Record<string, string> = { input };
  if (sessiontoken) params.sessiontoken = sessiontoken;
  const { data } = await api.get('/autocomplete', { params });
  return data;
}

export async function geocode(query: { placeId?: string; address?: string }): Promise<GeocodeResult> {
  const { data } = await api.post('/geocode', query);
  return data;
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  types: string[];
  photoUrl: string | null;
}

export async function searchPlaces(
  query: string,
  lat?: number,
  lng?: number
): Promise<PlaceSearchResult[]> {
  const params: Record<string, string> = { query };
  if (lat !== undefined) params.lat = String(lat);
  if (lng !== undefined) params.lng = String(lng);
  const { data } = await api.get('/places-search', { params });
  return data || [];
}

export async function search(request: {
  participants: Array<{ name: string; lat: number; lng: number; address: string }>;
  mealType: 'coffee' | 'lunch' | 'dinner';
  dietaryRestrictions?: string[];
  cuisineExclusions?: string[];
}): Promise<SearchResponse> {
  const { data } = await api.post('/search', request);
  return data;
}
