import { z } from 'zod';

export const participantSchema = z.object({
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().min(1),
});

export const searchRequestSchema = z.object({
  participants: z.array(participantSchema).min(2).max(4),
  mealType: z.enum(['coffee', 'lunch', 'dinner']),
  dietaryRestrictions: z.array(z.string()).optional(),
  cuisineExclusions: z.array(z.string()).optional(),
});

export const geocodeRequestSchema = z.union([
  z.object({ placeId: z.string().min(1) }),
  z.object({ address: z.string().min(1) }),
]);
