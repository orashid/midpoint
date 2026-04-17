import { Router } from 'express';
import { SignJWT } from 'jose';
import axios from 'axios';
import { config } from '../config';
import { query } from '../db';
import { verifyProviderToken } from '../services/auth-providers';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

const VALID_PROVIDERS = ['google', 'apple', 'facebook'];
const TOKEN_EXPIRY = '30d';

async function issueToken(userId: string, email: string): Promise<string> {
  const secret = new TextEncoder().encode(config.jwtSecret);
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
}

// POST /api/auth/login
authRouter.post('/auth/login', async (req, res, next) => {
  try {
    const { provider, token } = req.body;
    if (!provider || !token) {
      return res.status(400).json({ error: 'provider and token are required' });
    }
    if (!VALID_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: `Unsupported provider. Use: ${VALID_PROVIDERS.join(', ')}` });
    }

    // Validate the provider token and extract profile
    const profile = await verifyProviderToken(provider, token);

    // Upsert user
    const { rows } = await query(
      `INSERT INTO users (provider, provider_sub, email, display_name, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (provider, provider_sub)
       DO UPDATE SET
         email = COALESCE(EXCLUDED.email, users.email),
         display_name = COALESCE(EXCLUDED.display_name, users.display_name),
         avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
         updated_at = now()
       RETURNING id, email, display_name, avatar_url`,
      [profile.provider, profile.providerSub, profile.email, profile.displayName, profile.avatarUrl || null]
    );

    const user = rows[0];

    // Ensure user_preferences row exists
    await query(
      `INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [user.id]
    );

    // Issue Midpoint JWT
    const midpointToken = await issueToken(user.id, user.email);

    res.json({
      token: midpointToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err: any) {
    console.error('[auth] Login failed:', err.message);
    if (err.message.includes('Invalid') || err.message.includes('token')) {
      return res.status(401).json({ error: 'Authentication failed. Please try again.' });
    }
    next(err);
  }
});

// GET /api/auth/me
authRouter.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, email, display_name, avatar_url, provider, created_at FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = rows[0];
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      provider: user.provider,
      createdAt: user.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/facebook/callback — landing page; mobile catches this URL via openAuthSessionAsync
authRouter.get('/auth/facebook/callback', (_req, res) => {
  res.send('<!DOCTYPE html><html><body><p>Authentication complete. You can close this window.</p></body></html>');
});

// POST /api/auth/facebook/exchange — exchanges code for access token
authRouter.post('/auth/facebook/exchange', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: config.facebookAppId,
        client_secret: config.facebookAppSecret,
        redirect_uri: redirectUri,
        code,
      },
    });

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      return res.status(400).json({ error: 'Failed to obtain access token' });
    }

    res.json({ accessToken });
  } catch (err: any) {
    console.error('[auth] Facebook exchange error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Facebook token exchange failed' });
  }
});

// POST /api/auth/logout (client-side token deletion; server no-op for stateless JWT)
authRouter.post('/auth/logout', requireAuth, (_req, res) => {
  res.json({ success: true });
});
