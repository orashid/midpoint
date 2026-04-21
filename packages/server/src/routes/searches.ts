import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../db';

export const searchesRouter = Router();

// GET /api/searches
searchesRouter.get('/searches', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM recent_searches
       WHERE user_id = $1
       ORDER BY pinned DESC, created_at DESC
       LIMIT 10`,
      [req.user!.id]
    );
    res.json(rows.map(mapSearchToClient));
  } catch (err) {
    next(err);
  }
});

// POST /api/searches — save a search (upsert by participant key)
searchesRouter.post('/searches', requireAuth, async (req, res, next) => {
  try {
    const { participants, mealType, dietaryRestrictions, cuisineInclusions } = req.body;
    if (!Array.isArray(participants) || !mealType) {
      return res.status(400).json({ error: 'participants and mealType are required' });
    }

    // Create participant key for dedup
    const participantKey = participants
      .map((p: any) => `${(p.name || '').toLowerCase()}|${(p.address || '').toLowerCase()}`)
      .sort()
      .join('::');

    // Check for existing search with same participants
    const { rows: existing } = await query(
      `SELECT id, participants FROM recent_searches WHERE user_id = $1`,
      [req.user!.id]
    );

    const match = existing.find((s: any) => {
      const key = (s.participants || [])
        .map((p: any) => `${(p.name || '').toLowerCase()}|${(p.address || '').toLowerCase()}`)
        .sort()
        .join('::');
      return key === participantKey;
    });

    if (match) {
      // Update existing
      await query(
        `UPDATE recent_searches
         SET participants = $1, meal_type = $2, dietary_restrictions = $3, cuisine_inclusions = $4, created_at = now()
         WHERE id = $5`,
        [JSON.stringify(participants), mealType, dietaryRestrictions || [], cuisineInclusions || [], match.id]
      );
    } else {
      // Insert new
      await query(
        `INSERT INTO recent_searches (user_id, participants, meal_type, dietary_restrictions, cuisine_inclusions)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user!.id, JSON.stringify(participants), mealType, dietaryRestrictions || [], cuisineInclusions || []]
      );

      // Keep max 10 (delete oldest unpinned if over limit)
      await query(
        `DELETE FROM recent_searches
         WHERE id IN (
           SELECT id FROM recent_searches
           WHERE user_id = $1 AND pinned = false
           ORDER BY created_at DESC
           OFFSET 10
         )`,
        [req.user!.id]
      );
    }

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/searches/:id/pin
searchesRouter.patch('/searches/:id/pin', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE recent_searches SET pinned = NOT pinned WHERE id = $1 AND user_id = $2 RETURNING pinned`,
      [req.params.id, req.user!.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Search not found' });
    res.json({ pinned: rows[0].pinned });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/searches/:id
searchesRouter.delete('/searches/:id', requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM recent_searches WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Search not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

function mapSearchToClient(row: any) {
  return {
    id: row.id,
    participants: row.participants,
    mealType: row.meal_type,
    dietaryRestrictions: row.dietary_restrictions || [],
    cuisineInclusions: row.cuisine_inclusions || [],
    timestamp: new Date(row.created_at).getTime(),
    pinned: row.pinned,
  };
}
