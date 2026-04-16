import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { apiLimiter } from '../../middleware/rate-limiter';

function createTestApp() {
  const app = express();
  app.use('/api', apiLimiter);
  app.get('/api/test', (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('apiLimiter', () => {
  it('should allow requests under the limit', async () => {
    const app = createTestApp();

    const res = await request(app).get('/api/test');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('should include rate limit headers', async () => {
    const app = createTestApp();

    const res = await request(app).get('/api/test');

    // express-rate-limit uses standardHeaders by default
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });

  it('should not include legacy X-RateLimit headers', async () => {
    const app = createTestApp();

    const res = await request(app).get('/api/test');

    // legacyHeaders is false in the config
    expect(res.headers).not.toHaveProperty('x-ratelimit-limit');
    expect(res.headers).not.toHaveProperty('x-ratelimit-remaining');
  });

  it('should not apply to non-api routes', async () => {
    const app = express();
    app.use('/api', apiLimiter);
    app.get('/health', (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    // No rate limit headers on non-api routes
    expect(res.headers).not.toHaveProperty('ratelimit-limit');
  });
});
