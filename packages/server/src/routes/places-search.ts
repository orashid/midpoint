import { Router } from 'express';
import { textSearchPlaces, getPhotoUrl } from '../services/google-maps';

export const placesSearchRouter = Router();

placesSearchRouter.get('/places-search', async (req, res, next) => {
  try {
    const query = (req.query.query as string || '').slice(0, 200);
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

    if (lat !== undefined && (isNaN(lat) || lat < -90 || lat > 90)) {
      return res.status(400).json({ error: 'Invalid latitude' });
    }
    if (lng !== undefined && (isNaN(lng) || lng < -180 || lng > 180)) {
      return res.status(400).json({ error: 'Invalid longitude' });
    }

    const results = await textSearchPlaces(query, lat, lng);

    const mapped = results.map((r: any) => ({
      placeId: r.place_id,
      name: r.name,
      address: r.vicinity || '',
      lat: r.geometry?.location?.lat,
      lng: r.geometry?.location?.lng,
      rating: r.rating || 0,
      types: r.types || [],
      photoUrl: r.photos?.length ? getPhotoUrl(r.photos[0].photo_reference) : null,
    }));

    res.json(mapped);
  } catch (err) {
    next(err);
  }
});
