import { Router } from 'express';
import { fetchPhoto } from '../services/google-maps';

export const photoRouter = Router();

photoRouter.get('/photo', async (req, res, next) => {
  try {
    const ref = req.query.ref as string;
    if (!ref || !ref.startsWith('places/')) {
      return res.status(400).json({ error: 'Invalid photo reference' });
    }

    const parsed = parseInt(req.query.maxWidth as string);
    const maxWidth = Math.min(Math.max(isNaN(parsed) ? 400 : parsed, 100), 800);
    const { data, contentType } = await fetchPhoto(ref, maxWidth);

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(data);
  } catch (err) {
    next(err);
  }
});
