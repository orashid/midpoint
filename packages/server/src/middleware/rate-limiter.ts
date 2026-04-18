import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// General API limiter — broad catch-all to prevent abuse.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Stricter limiter for auth endpoints (per IP).
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
});

// Per-IP limit for expensive Google Maps proxy endpoints.
// These hit paid Google APIs — keep the window tight.
export const mapsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many map requests, please slow down.' },
});

// Per-authenticated-user limit for the main /api/search endpoint (most expensive).
// 20 searches per user per 24h is generous for real use but caps abuse/bugs.
// Keyed on the JWT subject (user id), NOT the IP, so shared offices/wifi don't
// block each other.
export const searchLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Prefer user id (set by requireAuth); fall back to IP for un-authed requests.
    // `req.user?.id` is populated by requireAuth middleware when it runs first.
    return (req as any).user?.id || req.ip || 'unknown';
  },
  message: {
    error:
      "You've hit today's search limit. To keep Midpoint free, we cap searches at 20 per day. Try again tomorrow!",
  },
});
