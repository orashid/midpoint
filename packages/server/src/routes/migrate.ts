import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { transaction } from '../db';

export const migrateRouter = Router();

// POST /api/migrate — bulk import local data on first sign-in
migrateRouter.post('/migrate', requireAuth, async (req, res, next) => {
  try {
    const { spots, people, searches, preferences, myInfo } = req.body;
    const userId = req.user!.id;

    await transaction(async (client) => {
      // Import saved restaurants and their visits
      if (Array.isArray(spots)) {
        for (const spot of spots) {
          const { rows } = await client.query(
            `INSERT INTO saved_restaurants (user_id, place_id, name, address, lat, lng, cuisine_type, family_rating, photo_url, date_added)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, to_timestamp($10 / 1000.0))
             ON CONFLICT (user_id, place_id) DO NOTHING
             RETURNING id`,
            [userId, spot.placeId, spot.name, spot.address || '', spot.lat || 0, spot.lng || 0,
             spot.cuisineType || 'other', spot.familyRating || 3, spot.photoUrl || null, spot.dateAdded || Date.now()]
          );

          // If inserted (not a conflict), import visits
          if (rows.length > 0 && Array.isArray(spot.visits)) {
            const restaurantId = rows[0].id;
            for (const visit of spot.visits) {
              await client.query(
                `INSERT INTO visits (restaurant_id, user_id, visited_at) VALUES ($1, $2, to_timestamp($3 / 1000.0))`,
                [restaurantId, userId, visit.date || Date.now()]
              );
            }
          }
        }
      }

      // Import saved people
      if (Array.isArray(people)) {
        for (const person of people) {
          await client.query(
            `INSERT INTO saved_people (user_id, name, address, lat, lng, use_count, last_used)
             VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))
             ON CONFLICT (user_id, lower(name), address) DO NOTHING`,
            [userId, person.name, person.address, person.lat || 0, person.lng || 0,
             person.useCount || 1, person.lastUsed || Date.now()]
          );
        }
      }

      // Import recent searches
      if (Array.isArray(searches)) {
        for (const search of searches) {
          await client.query(
            `INSERT INTO recent_searches (user_id, participants, meal_type, dietary_restrictions, cuisine_exclusions, pinned, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7 / 1000.0))`,
            [userId, JSON.stringify(search.participants), search.mealType || 'dinner',
             search.dietaryRestrictions || [], search.cuisineExclusions || [],
             search.pinned || false, search.timestamp || Date.now()]
          );
        }
      }

      // Import preferences and myInfo
      const mealType = preferences?.mealType || 'dinner';
      const dietaryRestrictions = preferences?.dietaryRestrictions || [];
      const cuisineExclusions = preferences?.cuisineExclusions || [];
      const myName = myInfo?.name || null;
      const myAddress = myInfo?.address || null;
      const myLat = myInfo?.lat || null;
      const myLng = myInfo?.lng || null;

      await client.query(
        `INSERT INTO user_preferences (user_id, meal_type, dietary_restrictions, cuisine_exclusions, my_name, my_address, my_lat, my_lng)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id)
         DO UPDATE SET
           meal_type = EXCLUDED.meal_type,
           dietary_restrictions = EXCLUDED.dietary_restrictions,
           cuisine_exclusions = EXCLUDED.cuisine_exclusions,
           my_name = COALESCE(EXCLUDED.my_name, user_preferences.my_name),
           my_address = COALESCE(EXCLUDED.my_address, user_preferences.my_address),
           my_lat = COALESCE(EXCLUDED.my_lat, user_preferences.my_lat),
           my_lng = COALESCE(EXCLUDED.my_lng, user_preferences.my_lng)`,
        [userId, mealType, dietaryRestrictions, cuisineExclusions, myName, myAddress, myLat, myLng]
      );
    });

    res.json({ success: true, message: 'Local data migrated successfully' });
  } catch (err) {
    next(err);
  }
});
