import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the auth middleware to inject a test user
vi.mock('../../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  },
}));

// Mock the database query function
const mockQuery = vi.fn();
vi.mock('../../db/index', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

import { spotsRouter } from '../../routes/spots';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', spotsRouter);
  return app;
}

describe('spots routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
    mockQuery.mockReset();
  });

  describe('POST /api/spots', () => {
    it('should return 400 when placeId is missing', async () => {
      const res = await request(app)
        .post('/api/spots')
        .send({ name: 'Test Restaurant' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('placeId and name are required');
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/spots')
        .send({ placeId: 'ChIJ123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('placeId and name are required');
    });

    it('should return 400 when both placeId and name are missing', async () => {
      const res = await request(app)
        .post('/api/spots')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('placeId and name are required');
    });

    it('should return 201 when valid data is provided', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          place_id: 'ChIJ123',
          name: 'Test Restaurant',
          address: '123 Main St',
          lat: 37.7749,
          lng: -122.4194,
          cuisine_type: 'italian',
          family_rating: 4,
          photo_url: null,
          date_added: new Date().toISOString(),
        }],
      });

      const res = await request(app)
        .post('/api/spots')
        .send({
          placeId: 'ChIJ123',
          name: 'Test Restaurant',
          address: '123 Main St',
          lat: 37.7749,
          lng: -122.4194,
          cuisineType: 'italian',
          familyRating: 4,
        });

      expect(res.status).toBe(201);
      expect(res.body.placeId).toBe('ChIJ123');
      expect(res.body.name).toBe('Test Restaurant');
      expect(res.body.cuisineType).toBe('italian');
      expect(res.body.familyRating).toBe(4);
    });

    it('should use defaults for optional fields', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          place_id: 'ChIJ123',
          name: 'Minimal',
          address: '',
          lat: 0,
          lng: 0,
          cuisine_type: 'other',
          family_rating: 3,
          photo_url: null,
          date_added: new Date().toISOString(),
        }],
      });

      const res = await request(app)
        .post('/api/spots')
        .send({ placeId: 'ChIJ123', name: 'Minimal' });

      expect(res.status).toBe(201);

      // Verify defaults were passed to query
      const queryCall = mockQuery.mock.calls[0];
      const params = queryCall[1];
      expect(params[3]).toBe(''); // address default
      expect(params[4]).toBe(0);  // lat default
      expect(params[5]).toBe(0);  // lng default
      expect(params[6]).toBe('other'); // cuisineType default
      expect(params[7]).toBe(3);  // familyRating default
    });
  });

  describe('PATCH /api/spots/:placeId/rating', () => {
    it('should return 400 when rating is not a number', async () => {
      const res = await request(app)
        .patch('/api/spots/ChIJ123/rating')
        .send({ rating: 'five' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Rating must be between 1 and 5');
    });

    it('should return 400 when rating is less than 1', async () => {
      const res = await request(app)
        .patch('/api/spots/ChIJ123/rating')
        .send({ rating: 0 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Rating must be between 1 and 5');
    });

    it('should return 400 when rating is greater than 5', async () => {
      const res = await request(app)
        .patch('/api/spots/ChIJ123/rating')
        .send({ rating: 6 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Rating must be between 1 and 5');
    });

    it('should return 400 when rating is missing', async () => {
      const res = await request(app)
        .patch('/api/spots/ChIJ123/rating')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Rating must be between 1 and 5');
    });

    it('should return 404 when spot is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const res = await request(app)
        .patch('/api/spots/nonexistent/rating')
        .send({ rating: 4 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Spot not found');
    });

    it('should return success for valid rating', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app)
        .patch('/api/spots/ChIJ123/rating')
        .send({ rating: 5 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should accept boundary values 1 and 5', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      const res1 = await request(app)
        .patch('/api/spots/ChIJ123/rating')
        .send({ rating: 1 });
      expect(res1.status).toBe(200);

      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      const res5 = await request(app)
        .patch('/api/spots/ChIJ123/rating')
        .send({ rating: 5 });
      expect(res5.status).toBe(200);
    });
  });

  describe('PATCH /api/spots/:placeId/cuisine', () => {
    it('should return 400 when cuisineType is missing', async () => {
      const res = await request(app)
        .patch('/api/spots/ChIJ123/cuisine')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('cuisineType is required');
    });

    it('should return 400 when cuisineType is not a string', async () => {
      const res = await request(app)
        .patch('/api/spots/ChIJ123/cuisine')
        .send({ cuisineType: 123 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('cuisineType is required');
    });

    it('should return 404 when spot is not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const res = await request(app)
        .patch('/api/spots/nonexistent/cuisine')
        .send({ cuisineType: 'thai' });

      expect(res.status).toBe(404);
    });

    it('should return success for valid cuisineType', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app)
        .patch('/api/spots/ChIJ123/cuisine')
        .send({ cuisineType: 'japanese' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/spots/:placeId', () => {
    it('should return 404 when spot does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const res = await request(app).delete('/api/spots/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Spot not found');
    });

    it('should return success when spot is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const res = await request(app).delete('/api/spots/ChIJ123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/spots', () => {
    it('should return mapped spots with visits', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          place_id: 'ChIJ123',
          name: 'Pizza Place',
          address: '456 Elm St',
          lat: 37.0,
          lng: -122.0,
          cuisine_type: 'italian',
          family_rating: 5,
          photo_url: 'https://photo.url/img.jpg',
          date_added: '2024-01-15T00:00:00Z',
          visits: [{ id: 1, date: 1705276800000 }],
        }],
      });

      const res = await request(app).get('/api/spots');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].placeId).toBe('ChIJ123');
      expect(res.body[0].name).toBe('Pizza Place');
      expect(res.body[0].familyRating).toBe(5);
      expect(res.body[0].visits).toHaveLength(1);
    });

    it('should return empty array when no spots exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).get('/api/spots');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
