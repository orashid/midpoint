import { Router } from 'express';
import { geocodeRequestSchema } from '@midpoint/shared';
import { geocode } from '../services/google-maps';

export const geocodeRouter = Router();

geocodeRouter.post('/geocode', async (req, res, next) => {
  try {
    const parsed = geocodeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
      return;
    }
    const result = await geocode(parsed.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
