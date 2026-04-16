import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { apiLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { autocompleteRouter } from './routes/autocomplete';
import { geocodeRouter } from './routes/geocode';
import { searchRouter } from './routes/search';
import { placesSearchRouter } from './routes/places-search';
import { photoRouter } from './routes/photo';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : '*',
}));
app.use(express.json({ limit: '10kb' }));
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', autocompleteRouter);
app.use('/api', geocodeRouter);
app.use('/api', searchRouter);
app.use('/api', placesSearchRouter);
app.use('/api', photoRouter);

app.use(errorHandler);

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Midpoint server running on 0.0.0.0:${config.port}`);
  if (!config.googleMapsApiKey) {
    console.warn('WARNING: GOOGLE_MAPS_API_KEY is not set');
  }
});
