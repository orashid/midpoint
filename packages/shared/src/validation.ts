import { z } from 'zod';
import { MIN_PARTICIPANTS, MAX_PARTICIPANTS } from './constants';

export const participantSchema = z.object({
  name: z.string().min(1).max(100),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(1).max(500),
});

export const searchRequestSchema = z.object({
  participants: z.array(participantSchema).min(MIN_PARTICIPANTS).max(MAX_PARTICIPANTS),
  mealType: z.enum(['coffee', 'lunch', 'dinner']),
  dietaryRestrictions: z.array(z.string().max(50)).max(10).optional(),
  cuisineInclusions: z.array(z.string().max(50)).max(20).optional(),
  brandQuery: z.string().trim().max(100).optional(),
});

export const geocodeRequestSchema = z.union([
  z.object({ placeId: z.string().min(1).max(200) }),
  z.object({ address: z.string().min(1).max(500) }),
]);
