import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../db';

export const peopleRouter = Router();

// GET /api/people
peopleRouter.get('/people', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM saved_people WHERE user_id = $1 ORDER BY use_count DESC, last_used DESC`,
      [req.user!.id]
    );
    res.json(rows.map(mapPersonToClient));
  } catch (err) {
    next(err);
  }
});

// POST /api/people — upsert a person
peopleRouter.post('/people', requireAuth, async (req, res, next) => {
  try {
    const { name, address, lat, lng } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'name and address are required' });
    }

    const { rows } = await query(
      `INSERT INTO saved_people (user_id, name, address, lat, lng, use_count, last_used)
       VALUES ($1, $2, $3, $4, $5, 1, now())
       ON CONFLICT (user_id, lower(name), address)
       DO UPDATE SET
         use_count = saved_people.use_count + 1,
         last_used = now(),
         lat = EXCLUDED.lat,
         lng = EXCLUDED.lng
       RETURNING *`,
      [req.user!.id, name, address, lat || 0, lng || 0]
    );

    res.status(201).json(mapPersonToClient(rows[0]));
  } catch (err) {
    next(err);
  }
});

// POST /api/people/batch — upsert multiple people
peopleRouter.post('/people/batch', requireAuth, async (req, res, next) => {
  try {
    const { participants } = req.body;
    if (!Array.isArray(participants)) {
      return res.status(400).json({ error: 'participants array is required' });
    }

    for (const p of participants) {
      if (!p.name || !p.address) continue;
      await query(
        `INSERT INTO saved_people (user_id, name, address, lat, lng, use_count, last_used)
         VALUES ($1, $2, $3, $4, $5, 1, now())
         ON CONFLICT (user_id, lower(name), address)
         DO UPDATE SET
           use_count = saved_people.use_count + 1,
           last_used = now(),
           lat = EXCLUDED.lat,
           lng = EXCLUDED.lng`,
        [req.user!.id, p.name, p.address, p.lat || 0, p.lng || 0]
      );
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/people
peopleRouter.delete('/people', requireAuth, async (req, res, next) => {
  try {
    const { name, address } = req.body;
    if (!name || !address) {
      return res.status(400).json({ error: 'name and address are required' });
    }

    const { rowCount } = await query(
      `DELETE FROM saved_people WHERE user_id = $1 AND lower(name) = lower($2) AND address = $3`,
      [req.user!.id, name, address]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Person not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

function mapPersonToClient(row: any) {
  return {
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    useCount: row.use_count,
    lastUsed: new Date(row.last_used).getTime(),
  };
}
