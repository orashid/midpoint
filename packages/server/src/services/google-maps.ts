import axios from 'axios';
import { config } from '../config';

const API_TIMEOUT = 10000; // 10 seconds

const PLACES_V2_URL = 'https://places.googleapis.com/v1/places';
const ROUTES_URL = 'https://routes.googleapis.com';
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export async function placesAutocomplete(input: string, sessiontoken?: string) {
  // Don't restrict includedPrimaryTypes — we want street addresses, routes,
  // POIs, localities, and postal codes all to surface as predictions. The
  // previous restriction to just locality/sublocality/postal_code meant
  // partial street addresses (e.g. "123 Main") never matched anything.
  const { data } = await axios.post(
    `${PLACES_V2_URL}:autocomplete`,
    {
      input,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googleMapsApiKey,
      },
      timeout: API_TIMEOUT,
    }
  );

  return (data.suggestions || [])
    .filter((s: any) => s.placePrediction?.placeId)
    .map((s: any) => {
      const place = s.placePrediction;
      return {
        placeId: place.placeId,
        description: place.text?.text || place.structuredFormat?.mainText?.text || '',
      };
    });
}

export async function geocode(query: { placeId?: string; address?: string }) {
  const params: Record<string, string> = { key: config.googleMapsApiKey };
  if (query.placeId) {
    params.place_id = query.placeId;
  } else if (query.address) {
    params.address = query.address;
  }

  const { data } = await axios.get(GEOCODE_URL, { params, timeout: API_TIMEOUT });
  if (!data.results || data.results.length === 0) throw new Error('Address not found');

  const result = data.results[0];
  if (!result.geometry?.location?.lat || !result.geometry?.location?.lng) {
    throw new Error('Invalid geometry in geocode result');
  }
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address || '',
  };
}

const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.priceLevel,places.types,places.photos';

function normalizePlaces(places: any[]) {
  return places
    .filter((p: any) => p.id && p.location?.latitude != null && p.location?.longitude != null)
    .map((p: any) => ({
      place_id: p.id,
      name: p.displayName?.text || '',
      vicinity: p.formattedAddress || '',
      geometry: { location: { lat: p.location.latitude, lng: p.location.longitude } },
      rating: p.rating || 0,
      price_level: priceLevelToNumber(p.priceLevel),
      types: p.types || [],
      photos: p.photos?.length
        ? [{ photo_reference: p.photos[0].name }]
        : [],
    }));
}

export async function nearbySearch(
  lat: number,
  lng: number,
  radius: number,
  type: string,
  keyword: string
) {
  const includedTypes = type === 'cafe' ? ['cafe', 'coffee_shop'] : ['restaurant'];

  // Run nearby search + text search + chain search to get broad coverage
  const textSearchFn = (query: string, maxResults = 10, restrictTypes = true) =>
    axios.post(
      `${PLACES_V2_URL}:searchText`,
      {
        textQuery: query,
        maxResultCount: maxResults,
        ...(restrictTypes ? { includedType: type === 'cafe' ? 'cafe' : 'restaurant' } : {}),
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius,
          },
        },
      },
      { headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': config.googleMapsApiKey, 'X-Goog-FieldMask': FIELD_MASK }, timeout: API_TIMEOUT }
    ).then(r => r.data.places || []).catch((err) => {
      console.warn(`[google-maps] Text search failed for "${query}":`, err.message);
      return [];
    });

  const chainQueries = type === 'cafe'
    ? ['Starbucks', 'Peet\'s Coffee', 'Dutch Bros']
    : ['restaurant ' + keyword];

  const [nearbyResults, textResults, ...chainResults] = await Promise.all([
    axios.post(
      `${PLACES_V2_URL}:searchNearby`,
      {
        includedTypes,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius,
          },
        },
      },
      { headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': config.googleMapsApiKey, 'X-Goog-FieldMask': FIELD_MASK }, timeout: API_TIMEOUT }
    ).then(r => r.data.places || []).catch((err) => {
      console.warn('[google-maps] Nearby search failed:', err.message);
      return [];
    }),

    textSearchFn(keyword),
    ...chainQueries.map(q => textSearchFn(q, 5)),
  ]);

  // Merge and dedup by place ID
  const allChainResults = chainResults.flat();
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const p of [...nearbyResults, ...textResults, ...allChainResults]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      merged.push(p);
    }
  }

  return normalizePlaces(merged);
}

function priceLevelToNumber(priceLevel?: string): number {
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[priceLevel || ''] ?? 0;
}

export async function distanceMatrix(
  origins: Array<{ lat: number; lng: number }>,
  destinations: Array<{ lat: number; lng: number }>
) {
  // Routes API computeRouteMatrix
  const matrixOrigins = origins.map((o) => ({
    waypoint: { location: { latLng: { latitude: o.lat, longitude: o.lng } } },
  }));
  const matrixDestinations = destinations.map((d) => ({
    waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
  }));

  try {
    const { data } = await axios.post(
      `${ROUTES_URL}/distanceMatrix/v2:computeRouteMatrix`,
      {
        origins: matrixOrigins,
        destinations: matrixDestinations,
        travelMode: 'DRIVE',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.googleMapsApiKey,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status',
        },
        timeout: API_TIMEOUT,
      }
    );

    // Convert flat array response into rows format matching legacy API shape
    const rows: any[] = origins.map(() => ({
      elements: destinations.map(() => ({ status: 'ZERO_RESULTS' })),
    }));

    for (const entry of data) {
      if (entry.status?.code && entry.status.code !== 0) continue;
      const oi = entry.originIndex ?? 0;
      const di = entry.destinationIndex ?? 0;
      if (oi < 0 || oi >= rows.length || di < 0 || di >= rows[oi].elements.length) continue;
      const durationSec = entry.duration
        ? parseInt(String(entry.duration).replace(/[^0-9]/g, ''), 10) || 0
        : 0;
      const distMeters = entry.distanceMeters || 0;

      rows[oi].elements[di] = {
        status: 'OK',
        duration: {
          value: durationSec,
          text: formatDuration(durationSec),
        },
        distance: {
          value: distMeters,
          text: formatDistance(distMeters),
        },
      };
    }

    return rows;
  } catch (err: any) {
    console.warn('[google-maps] Routes API failed, falling back to legacy:', err.message);
    // Fallback: try legacy Distance Matrix API
    const originsStr = origins.map((o) => `${o.lat},${o.lng}`).join('|');
    const destsStr = destinations.map((d) => `${d.lat},${d.lng}`).join('|');

    const { data } = await axios.get(
      'https://maps.googleapis.com/maps/api/distancematrix/json',
      {
        params: {
          origins: originsStr,
          destinations: destsStr,
          mode: 'driving',
          key: config.googleMapsApiKey,
        },
        timeout: API_TIMEOUT,
      }
    );
    if (!data.rows) throw new Error('Distance matrix service unavailable');
    return data.rows;
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  return miles < 0.1 ? `${Math.round(meters)} m` : `${miles.toFixed(1)} mi`;
}

export async function textSearchPlaces(
  query: string,
  lat?: number,
  lng?: number,
  radius = 30000
) {
  const body: any = {
    textQuery: query,
    maxResultCount: 10,
    includedType: 'restaurant',
  };
  if (lat !== undefined && lng !== undefined) {
    body.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius },
    };
  }

  const { data } = await axios.post(
    `${PLACES_V2_URL}:searchText`,
    body,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googleMapsApiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      timeout: API_TIMEOUT,
    }
  );

  return normalizePlaces(data.places || []);
}

export function getPhotoUrl(photoReference: string, maxWidth = 400): string {
  // Proxy through our server to avoid exposing API key to clients
  return `/api/photo?ref=${encodeURIComponent(photoReference)}&maxWidth=${maxWidth}`;
}

export async function fetchPhoto(photoReference: string, maxWidth = 400): Promise<{ data: Buffer; contentType: string }> {
  const url = `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=${maxWidth}&key=${config.googleMapsApiKey}`;
  const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000 });
  return {
    data: response.data,
    contentType: response.headers['content-type'] || 'image/jpeg',
  };
}
