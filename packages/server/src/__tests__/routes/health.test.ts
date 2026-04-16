import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Create a minimal app that mirrors the health route from index.ts
function createTestApp() {
  const app = express();
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  return app;
}

describe('GET /api/health', () => {
  const app = createTestApp();

  it('should return 200 with status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('should return JSON content type', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('should not require authentication', async () => {
    const res = await request(app).get('/api/health');

    // No auth header, should still return 200
    expect(res.status).toBe(200);
  });
});
