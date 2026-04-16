import { Router } from 'express';
import { placesAutocomplete } from '../services/google-maps';

export const autocompleteRouter = Router();

autocompleteRouter.get('/autocomplete', async (req, res, next) => {
  try {
    const input = String(req.query.input || '').slice(0, 200).trim();
    if (!input) {
      res.status(400).json({ error: 'input query parameter is required' });
      return;
    }
    const sessiontoken = req.query.sessiontoken as string | undefined;
    const results = await placesAutocomplete(input, sessiontoken);
    res.json(results);
  } catch (err) {
    next(err);
  }
});
