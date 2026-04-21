import { Router } from 'express';
import { searchRequestSchema, SearchResponse, MAX_RESULTS } from '@midpoint/shared';
import { calculateMidpoint, scoreRestaurants } from '../services/midpoint';
import { findCandidates } from '../services/places';

export const searchRouter = Router();

searchRouter.post('/search', async (req, res, next) => {
  try {
    const parsed = searchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
      return;
    }

    const { participants, mealType, cuisineInclusions, brandQuery } = parsed.data;
    const { centroid, radius } = calculateMidpoint(participants);

    let candidates = await findCandidates(
      centroid.lat, centroid.lng, radius, mealType, cuisineInclusions, brandQuery
    );

    // If too few results after filtering, try with larger radius
    if (candidates.length < 5) {
      const largerCandidates = await findCandidates(
        centroid.lat, centroid.lng, Math.min(radius * 2, 25000), mealType, cuisineInclusions, brandQuery
      );
      // Merge, dedup by placeId
      const seen = new Set(candidates.map((c: any) => c.placeId));
      for (const c of largerCandidates as any[]) {
        if (!seen.has(c.placeId)) candidates.push(c);
      }
    }

    const restaurants = await scoreRestaurants(participants, candidates);

    const response: SearchResponse = {
      midpoint: centroid,
      restaurants: restaurants.slice(0, MAX_RESULTS),
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});
