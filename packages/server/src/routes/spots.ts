import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../db';

export const spotsRouter = Router();

// GET /api/spots — list all saved restaurants with their visits
spotsRouter.get('/spots', requireAuth, async (req, res, next) => {
  try {
    const { rows: restaurants } = await query(
      `SELECT sr.*,
        COALESCE(
          json_agg(json_build_object('id', v.id, 'date', extract(epoch from v.visited_at) * 1000))
          FILTER (WHERE v.id IS NOT NULL),
          '[]'
        ) as visits
       FROM saved_restaurants sr
       LEFT JOIN visits v ON v.restaurant_id = sr.id
       WHERE sr.user_id = $1
       GROUP BY sr.id
       ORDER BY sr.date_added DESC`,
      [req.user!.id]
    );

    res.json(restaurants.map(mapSpotToClient));
  } catch (err) {
    next(err);
  }
});

// POST /api/spots — save a restaurant
spotsRouter.post('/spots', requireAuth, async (req, res, next) => {
  try {
    const { placeId, name, address, lat, lng, cuisineType, familyRating, photoUrl, phone } = req.body;
    if (!placeId || !name) {
      return res.status(400).json({ error: 'placeId and name are required' });
    }

    const { rows } = await query(
      `INSERT INTO saved_restaurants (user_id, place_id, name, address, lat, lng, cuisine_type, family_rating, photo_url, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, place_id)
       DO UPDATE SET
         cuisine_type = COALESCE(EXCLUDED.cuisine_type, saved_restaurants.cuisine_type),
         family_rating = COALESCE(EXCLUDED.family_rating, saved_restaurants.family_rating),
         photo_url = COALESCE(EXCLUDED.photo_url, saved_restaurants.photo_url),
         phone = COALESCE(EXCLUDED.phone, saved_restaurants.phone)
       RETURNING *`,
      [req.user!.id, placeId, name, address || '', lat || 0, lng || 0, cuisineType || 'other', familyRating || 3, photoUrl || null, phone || null]
    );

    res.status(201).json(mapSpotToClient({ ...rows[0], visits: [] }));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/spots/:placeId
spotsRouter.delete('/spots/:placeId', requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM saved_restaurants WHERE user_id = $1 AND place_id = $2',
      [req.user!.id, req.params.placeId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Spot not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/spots/:placeId/rating
spotsRouter.patch('/spots/:placeId/rating', requireAuth, async (req, res, next) => {
  try {
    const { rating } = req.body;
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    const { rowCount } = await query(
      'UPDATE saved_restaurants SET family_rating = $1 WHERE user_id = $2 AND place_id = $3',
      [rating, req.user!.id, req.params.placeId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Spot not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/spots/:placeId/cuisine
spotsRouter.patch('/spots/:placeId/cuisine', requireAuth, async (req, res, next) => {
  try {
    const { cuisineType } = req.body;
    if (!cuisineType || typeof cuisineType !== 'string') {
      return res.status(400).json({ error: 'cuisineType is required' });
    }
    const { rowCount } = await query(
      'UPDATE saved_restaurants SET cuisine_type = $1 WHERE user_id = $2 AND place_id = $3',
      [cuisineType, req.user!.id, req.params.placeId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Spot not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/spots/:placeId/visits — log a visit
spotsRouter.post('/spots/:placeId/visits', requireAuth, async (req, res, next) => {
  try {
    const { date } = req.body; // epoch ms, optional

    // Find the restaurant
    const { rows: spots } = await query(
      'SELECT id FROM saved_restaurants WHERE user_id = $1 AND place_id = $2',
      [req.user!.id, req.params.placeId]
    );
    if (spots.length === 0) return res.status(404).json({ error: 'Spot not found' });

    const visitedAt = date ? new Date(date) : new Date();
    const { rows } = await query(
      'INSERT INTO visits (restaurant_id, user_id, visited_at) VALUES ($1, $2, $3) RETURNING id, visited_at',
      [spots[0].id, req.user!.id, visitedAt]
    );

    res.status(201).json({
      id: rows[0].id,
      date: new Date(rows[0].visited_at).getTime(),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/spots/:placeId/visits/:visitId
spotsRouter.delete('/spots/:placeId/visits/:visitId', requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await query(
      `DELETE FROM visits v
       USING saved_restaurants sr
       WHERE v.id = $1
         AND v.restaurant_id = sr.id
         AND sr.user_id = $2
         AND sr.place_id = $3`,
      [req.params.visitId, req.user!.id, req.params.placeId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Visit not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Map DB row to client shape
function mapSpotToClient(row: any) {
  return {
    placeId: row.place_id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    cuisineType: row.cuisine_type,
    familyRating: row.family_rating,
    photoUrl: row.photo_url,
    phone: row.phone || null,
    dateAdded: new Date(row.date_added).getTime(),
    visits: (row.visits || []).map((v: any) => ({
      id: v.id,
      date: typeof v.date === 'number' ? v.date : new Date(v.date).getTime(),
    })),
  };
}
