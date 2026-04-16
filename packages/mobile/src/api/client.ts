import axios from 'axios';

const SERVER_ORIGIN = 'https://midpoint-production-749a.up.railway.app';
const BASE_URL = `${SERVER_ORIGIN}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

// ── Auth token management ──

let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function isAuthenticated(): boolean {
  return authToken !== null;
}

// Request interceptor: attach auth token
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// ── Generic helpers for authenticated calls ──

export async function apiGet(path: string, params?: Record<string, string>): Promise<any> {
  const { data } = await api.get(path, { params });
  return data;
}

export async function apiPost(path: string, body: any): Promise<any> {
  const { data } = await api.post(path, body);
  return data;
}

export async function apiPut(path: string, body: any): Promise<any> {
  const { data } = await api.put(path, body);
  return data;
}

export async function apiPatch(path: string, body: any): Promise<any> {
  const { data } = await api.patch(path, body);
  return data;
}

export async function apiDelete(path: string, body?: any): Promise<any> {
  const { data } = await api.delete(path, body ? { data: body } : undefined);
  return data;
}

// ── Types ──

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

// ── Public API functions (no auth required) ──

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

export function resolvePhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${SERVER_ORIGIN}${url}`;
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
