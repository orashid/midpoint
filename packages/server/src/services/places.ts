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

  const FOOD_TYPES = new Set([
    'restaurant', 'cafe', 'coffee_shop', 'bakery', 'bar',
    'meal_delivery', 'meal_takeaway', 'food',
    'american_restaurant', 'asian_restaurant', 'barbecue_restaurant',
    'brazilian_restaurant', 'breakfast_restaurant', 'brunch_restaurant',
    'chinese_restaurant', 'fast_food_restaurant', 'french_restaurant',
    'greek_restaurant', 'hamburger_restaurant', 'indian_restaurant',
    'indonesian_restaurant', 'italian_restaurant', 'japanese_restaurant',
    'korean_restaurant', 'lebanese_restaurant', 'mediterranean_restaurant',
    'mexican_restaurant', 'middle_eastern_restaurant', 'pizza_restaurant',
    'ramen_restaurant', 'seafood_restaurant', 'spanish_restaurant',
    'steak_house', 'sushi_restaurant', 'thai_restaurant',
    'turkish_restaurant', 'vegan_restaurant', 'vegetarian_restaurant',
    'vietnamese_restaurant', 'ice_cream_shop', 'juice_shop',
    'sandwich_shop', 'tea_house',
  ]);

  let candidates = results
    .filter((r: any) => {
      const types: string[] = r.types || [];
      const hasFood = types.some((t: string) => FOOD_TYPES.has(t));
      if (!hasFood) {
        console.log(`[places] Filtered out "${r.name}" — types: ${types.join(', ')}`);
      }
      return hasFood;
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
