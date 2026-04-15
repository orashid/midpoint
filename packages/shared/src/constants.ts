import { MealType } from './types';

export const MEAL_TYPE_CONFIG: Record<MealType, { placeType: string; keyword: string }> = {
  coffee: { placeType: 'cafe', keyword: 'coffee' },
  lunch: { placeType: 'restaurant', keyword: 'lunch' },
  dinner: { placeType: 'restaurant', keyword: 'dinner' },
};

export const CUISINE_KEYWORDS: Record<string, string[]> = {
  chinese: ['chinese', 'dim sum', 'szechuan', 'cantonese', 'wok', 'dumpling'],
  indian: ['indian', 'curry', 'tandoori', 'biryani', 'masala', 'naan'],
  mexican: ['mexican', 'taco', 'burrito', 'enchilada', 'taqueria', 'cantina'],
  italian: ['italian', 'pizza', 'pasta', 'trattoria', 'ristorante', 'pizzeria'],
  japanese: ['japanese', 'sushi', 'ramen', 'teriyaki', 'izakaya', 'udon'],
  thai: ['thai', 'pad thai', 'curry', 'tom yum', 'satay'],
  korean: ['korean', 'bibimbap', 'bulgogi', 'kimchi', 'bbq'],
  vietnamese: ['vietnamese', 'pho', 'banh mi', 'bun'],
  mediterranean: ['mediterranean', 'falafel', 'hummus', 'shawarma', 'kebab'],
  american: ['american', 'burger', 'bbq', 'grill', 'steakhouse', 'diner'],
  fast_food: ['fast food', 'mcdonald', 'burger king', 'wendy', 'taco bell', 'kfc', 'chick-fil-a', 'popeyes', 'jack in the box', 'carl\'s jr', 'hardee', 'sonic', 'arby', 'five guys', 'in-n-out', 'whataburger', 'checkers', 'rally', 'white castle', 'del taco', 'wingstop', 'raising cane', 'panda express', 'chipotle', 'subway', 'jimmy john', 'jersey mike'],
};

export const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'halal',
  'kosher',
] as const;

export const CUISINE_OPTIONS = Object.keys(CUISINE_KEYWORDS);

export const MAX_PARTICIPANTS = 4;
export const MIN_PARTICIPANTS = 2;
export const SEARCH_RADIUS_MIN = 3000;
export const SEARCH_RADIUS_MAX = 25000;
export const MAX_CANDIDATES = 20;
export const MAX_RESULTS = 10;
