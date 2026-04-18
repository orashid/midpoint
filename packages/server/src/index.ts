import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { apiLimiter, authLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { autocompleteRouter } from './routes/autocomplete';
import { geocodeRouter } from './routes/geocode';
import { searchRouter } from './routes/search';
import { placesSearchRouter } from './routes/places-search';
import { photoRouter } from './routes/photo';
import { authRouter } from './routes/auth';
import { spotsRouter } from './routes/spots';
import { peopleRouter } from './routes/people';
import { searchesRouter } from './routes/searches';
import { preferencesRouter } from './routes/preferences';
import { migrateRouter } from './routes/migrate';
import { privacyRouter } from './routes/privacy';
import { runMigrations } from './db/migrate';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://midpoint-production-749a.up.railway.app'],
}));
app.use(express.json({ limit: '10kb' }));
// Larger limit for the migration endpoint (bulk data import)
app.use('/api/migrate', express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Public privacy policy (served at root, not under /api)
app.use('/', privacyRouter);

// Public routes (no auth required) — Google Maps proxies
app.use('/api', autocompleteRouter);
app.use('/api', geocodeRouter);
app.use('/api', searchRouter);
app.use('/api', placesSearchRouter);
app.use('/api', photoRouter);

// Auth routes (stricter rate limiting: 5 req/min per IP)
app.use('/api/auth', authLimiter);
app.use('/api', authRouter);

// Authenticated user data routes
app.use('/api', spotsRouter);
app.use('/api', peopleRouter);
app.use('/api', searchesRouter);
app.use('/api', preferencesRouter);
app.use('/api', migrateRouter);

app.use(errorHandler);

async function start() {
  // Run database migrations if DATABASE_URL is set
  if (config.databaseUrl) {
    try {
      await runMigrations();
    } catch (err) {
      console.error('Failed to run database migrations:', err);
      process.exit(1);
    }
  } else {
    console.warn('WARNING: DATABASE_URL is not set — auth and user data features disabled');
  }

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Midpoint server running on 0.0.0.0:${config.port}`);
    if (!config.googleMapsApiKey) {
      console.warn('WARNING: GOOGLE_MAPS_API_KEY is not set');
    }
    if (!config.jwtSecret) {
      console.warn('WARNING: JWT_SECRET is not set — auth will not work');
    }
  });
}

start();
