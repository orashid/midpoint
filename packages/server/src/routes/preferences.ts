import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../db';

export const preferencesRouter = Router();

// GET /api/preferences
preferencesRouter.get('/preferences', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [req.user!.id]
    );
    if (rows.length === 0) {
      return res.json({
        mealType: 'dinner',
        dietaryRestrictions: [],
        cuisineExclusions: [],
        myInfo: null,
      });
    }
    const row = rows[0];
    res.json({
      mealType: row.meal_type,
      dietaryRestrictions: row.dietary_restrictions || [],
      cuisineExclusions: row.cuisine_exclusions || [],
      myInfo: row.my_name ? {
        name: row.my_name,
        address: row.my_address || '',
        lat: row.my_lat || 0,
        lng: row.my_lng || 0,
      } : null,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/preferences
preferencesRouter.put('/preferences', requireAuth, async (req, res, next) => {
  try {
    const { mealType, dietaryRestrictions, cuisineExclusions } = req.body;

    await query(
      `INSERT INTO user_preferences (user_id, meal_type, dietary_restrictions, cuisine_exclusions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET
         meal_type = EXCLUDED.meal_type,
         dietary_restrictions = EXCLUDED.dietary_restrictions,
         cuisine_exclusions = EXCLUDED.cuisine_exclusions`,
      [req.user!.id, mealType || 'dinner', dietaryRestrictions || [], cuisineExclusions || []]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/me/info — get "my info" (home location)
preferencesRouter.get('/me/info', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT my_name, my_address, my_lat, my_lng FROM user_preferences WHERE user_id = $1',
      [req.user!.id]
    );
    if (rows.length === 0 || !rows[0].my_name) {
      return res.json(null);
    }
    const row = rows[0];
    res.json({
      name: row.my_name,
      address: row.my_address || '',
      lat: row.my_lat || 0,
      lng: row.my_lng || 0,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/me/info — update "my info"
preferencesRouter.put('/me/info', requireAuth, async (req, res, next) => {
  try {
    const { name, address, lat, lng } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'name and address are required' });
    }

    await query(
      `INSERT INTO user_preferences (user_id, my_name, my_address, my_lat, my_lng)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id)
       DO UPDATE SET
         my_name = EXCLUDED.my_name,
         my_address = EXCLUDED.my_address,
         my_lat = EXCLUDED.my_lat,
         my_lng = EXCLUDED.my_lng`,
      [req.user!.id, name, address, lat || 0, lng || 0]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
