import axios, { AxiosError } from 'axios';

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

// ── Error normalization ──
// Every caller can rely on err.code + err.userMessage being set.
// - code: 'NETWORK' | 'TIMEOUT' | 'AUTH_EXPIRED' | 'RATE_LIMIT_USER' | 'RATE_LIMIT_IP' | 'SERVER' | 'BAD_REQUEST' | 'UNKNOWN'
// - userMessage: safe to show directly in Alert / banner

export type ApiErrorCode =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'AUTH_EXPIRED'
  | 'RATE_LIMIT_USER'
  | 'RATE_LIMIT_IP'
  | 'SERVER'
  | 'BAD_REQUEST'
  | 'UNKNOWN';

export interface ApiError extends Error {
  code: ApiErrorCode;
  userMessage: string;
  status?: number;
}

// Callback the AuthContext registers so 401s can trigger a sign-out + redirect.
let onAuthExpired: (() => void) | null = null;
export function setOnAuthExpired(cb: (() => void) | null) {
  onAuthExpired = cb;
}

function normalizeError(err: unknown): ApiError {
  const out = new Error() as ApiError;
  out.code = 'UNKNOWN';
  out.userMessage = 'Something went wrong. Please try again.';

  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<any>;
    out.status = axErr.response?.status;

    if (axErr.code === 'ECONNABORTED') {
      out.code = 'TIMEOUT';
      out.userMessage =
        "That took longer than expected. Check your connection and try again.";
    } else if (!axErr.response) {
      out.code = 'NETWORK';
      out.userMessage =
        "Couldn't reach Midpoint. Check your internet connection.";
    } else if (axErr.response.status === 401) {
      out.code = 'AUTH_EXPIRED';
      out.userMessage = 'Your session expired. Please sign in again.';
    } else if (axErr.response.status === 429) {
      const serverMsg = axErr.response.data?.error;
      // Per-user /api/search limit returns a distinctive message we want to show.
      if (typeof serverMsg === 'string' && serverMsg.includes('daily')) {
        out.code = 'RATE_LIMIT_USER';
        out.userMessage = serverMsg;
      } else {
        out.code = 'RATE_LIMIT_IP';
        out.userMessage =
          typeof serverMsg === 'string'
            ? serverMsg
            : "You're going a bit fast. Please wait a moment and try again.";
      }
    } else if (axErr.response.status >= 500) {
      out.code = 'SERVER';
      out.userMessage = 'Midpoint is having trouble right now. Try again in a minute.';
    } else if (axErr.response.status >= 400) {
      out.code = 'BAD_REQUEST';
      out.userMessage =
        axErr.response.data?.error || 'Request was rejected. Please review your input.';
    }
    out.message = `[${out.code}] ${out.userMessage}`;
  } else if (err instanceof Error) {
    out.message = err.message;
  }

  return out;
}

// Response interceptor: normalize errors + trigger auto-logout on 401.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = normalizeError(error);
    // Only trigger auto-logout on 401s that carried a token — a 401 on a
    // request without Authorization is expected (e.g. the best-effort logout
    // call made AFTER we already cleared local state) and must not recurse.
    const requestHadAuth = !!error?.config?.headers?.Authorization;
    if (normalized.code === 'AUTH_EXPIRED' && requestHadAuth && onAuthExpired) {
      try { onAuthExpired(); } catch {}
    }
    return Promise.reject(normalized);
  }
);

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
