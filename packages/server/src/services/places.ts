import { CUISINE_KEYWORDS, MEAL_TYPE_CONFIG } from '@midpoint/shared';
import { MealType } from '@midpoint/shared';
import { nearbySearch, getPhotoUrl } from './google-maps';

export async function findCandidates(
  lat: number,
  lng: number,
  radius: number,
  mealType: MealType,
  cuisineExclusions?: string[]
) {
  const { placeType, keyword } = MEAL_TYPE_CONFIG[mealType];
  const results = await nearbySearch(lat, lng, radius, placeType, keyword);
  console.log(`[places] Found ${results.length} candidates for "${keyword}" near ${lat},${lng} r=${radius}m`);
  console.log(`[places] Names: ${results.map((r: any) => r.name).join(', ')}`);

  let candidates = results.map((r: any) => ({
    placeId: r.place_id,
    name: r.name,
    address: r.vicinity || '',
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    rating: r.rating || 0,
    priceLevel: r.price_level || 0,
    photoUrl: r.photos?.length ? getPhotoUrl(r.photos[0].photo_reference) : null,
    types: r.types || [],
  }));

  if (cuisineExclusions?.length) {
    candidates = filterExcludedCuisines(candidates, cuisineExclusions);
  }

  return candidates;
}

function filterExcludedCuisines<T extends { name: string; types: string[] }>(
  candidates: T[],
  exclusions: string[]
): T[] {
  return candidates.filter((c) => {
    const nameLower = c.name.toLowerCase();
    const typesStr = c.types.join(' ').toLowerCase();

    for (const exclusion of exclusions) {
      const keywords = CUISINE_KEYWORDS[exclusion.toLowerCase()] || [exclusion.toLowerCase()];
      for (const kw of keywords) {
        if (nameLower.includes(kw) || typesStr.includes(kw)) {
          return false;
        }
      }
    }
    return true;
  });
}
