import { CUISINE_KEYWORDS, MEAL_TYPE_CONFIG } from '@midpoint/shared';
import { MealType } from '@midpoint/shared';
import { nearbySearch, textSearchPlaces, getPhotoUrl } from './google-maps';

// Types that indicate a place is primarily NOT a restaurant.
const NON_FOOD_PRIMARY = new Set([
  'sports_complex', 'sports_activity_location', 'athletic_field',
  'golf_course', 'sports_school', 'sports_coaching',
  'shopping_mall', 'stadium', 'park', 'gym', 'school', 'library',
  'museum', 'movie_theater', 'amusement_park', 'bowling_alley',
  'night_club', 'casino', 'hotel', 'lodging', 'gas_station',
  'grocery_store', 'supermarket', 'convenience_store',
]);

export async function findCandidates(
  lat: number,
  lng: number,
  radius: number,
  mealType: MealType,
  cuisineInclusions?: string[],
  brandQuery?: string
) {
  const brand = brandQuery?.trim();
  const results = brand
    ? await textSearchPlaces(brand, lat, lng, radius)
    : await nearbySearch(lat, lng, radius, MEAL_TYPE_CONFIG[mealType].placeType, MEAL_TYPE_CONFIG[mealType].keyword);

  console.log(
    `[places] Found ${results.length} candidates${brand ? ` for brand "${brand}"` : ''} near ${lat},${lng} r=${radius}m`
  );
  console.log(`[places] Names: ${results.map((r: any) => r.name).join(', ')}`);

  let candidates = results
    .filter((r: any) => {
      const types: string[] = r.types || [];
      const isNonFood = types.some((t: string) => NON_FOOD_PRIMARY.has(t));
      if (isNonFood) {
        console.log(`[places] Filtered out "${r.name}" — types: ${types.join(', ')}`);
      }
      return !isNonFood;
    })
    .map((r: any) => ({
      placeId: r.place_id,
      name: r.name,
      address: r.vicinity || '',
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      rating: r.rating || 0,
      priceLevel: r.price_level || 0,
      photoUrl: r.photos?.length ? getPhotoUrl(r.photos[0].photo_reference) : null,
      phone: r.phone ?? null,
      types: r.types || [],
    }));

  // Brand search bypasses cuisine filter — user asked for a specific place.
  if (!brand && cuisineInclusions?.length) {
    candidates = filterToIncludedCuisines(candidates, cuisineInclusions);
  }

  return candidates;
}

function filterToIncludedCuisines<T extends { name: string; types: string[] }>(
  candidates: T[],
  inclusions: string[]
): T[] {
  return candidates.filter((c) => {
    const nameLower = c.name.toLowerCase();
    const typesStr = c.types.join(' ').toLowerCase();

    for (const inclusion of inclusions) {
      const keywords = CUISINE_KEYWORDS[inclusion.toLowerCase()] || [inclusion.toLowerCase()];
      for (const kw of keywords) {
        if (nameLower.includes(kw) || typesStr.includes(kw)) {
          return true;
        }
      }
    }
    return false;
  });
}
