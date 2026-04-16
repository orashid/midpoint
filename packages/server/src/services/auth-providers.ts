import { OAuth2Client } from 'google-auth-library';
import * as jose from 'jose';
import axios from 'axios';
import { config } from '../config';

export interface ProviderProfile {
  provider: string;
  providerSub: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

// ── Google ──
const googleClient = new OAuth2Client(config.googleClientId);

export async function verifyGoogle(idToken: string): Promise<ProviderProfile> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub) throw new Error('Invalid Google token');

  return {
    provider: 'google',
    providerSub: payload.sub,
    email: payload.email || '',
    displayName: payload.name || payload.email || '',
    avatarUrl: payload.picture,
  };
}

// ── Apple ──
// Apple provides id_tokens signed with their JWKS
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
let appleJWKS: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getAppleJWKS() {
  if (!appleJWKS) {
    appleJWKS = jose.createRemoteJWKSet(new URL(APPLE_JWKS_URL));
  }
  return appleJWKS;
}

export async function verifyApple(idToken: string): Promise<ProviderProfile> {
  const jwks = getAppleJWKS();
  const { payload } = await jose.jwtVerify(idToken, jwks, {
    issuer: 'https://appleid.apple.com',
    audience: config.appleClientId,
  });
  if (!payload.sub) throw new Error('Invalid Apple token');

  return {
    provider: 'apple',
    providerSub: payload.sub,
    email: (payload.email as string) || '',
    displayName: (payload.email as string)?.split('@')[0] || 'Apple User',
  };
}

// ── Facebook ──
// Facebook uses access tokens, not id_tokens. Validate by calling their graph API.
export async function verifyFacebook(accessToken: string): Promise<ProviderProfile> {
  // First verify the token is valid and belongs to our app
  const debugResp = await axios.get(
    `https://graph.facebook.com/debug_token`, {
      params: {
        input_token: accessToken,
        access_token: `${config.facebookAppId}|${process.env.FACEBOOK_APP_SECRET || ''}`,
      },
      timeout: 10000,
    }
  );
  const debugData = debugResp.data?.data;
  if (!debugData?.is_valid || debugData.app_id !== config.facebookAppId) {
    throw new Error('Invalid Facebook token');
  }

  // Fetch user profile
  const profileResp = await axios.get('https://graph.facebook.com/me', {
    params: {
      fields: 'id,name,email,picture.type(large)',
      access_token: accessToken,
    },
    timeout: 10000,
  });
  const profile = profileResp.data;
  if (!profile.id) throw new Error('Failed to fetch Facebook profile');

  return {
    provider: 'facebook',
    providerSub: profile.id,
    email: profile.email || '',
    displayName: profile.name || 'Facebook User',
    avatarUrl: profile.picture?.data?.url,
  };
}

// ── Provider dispatch ──
export async function verifyProviderToken(
  provider: string,
  token: string
): Promise<ProviderProfile> {
  switch (provider) {
    case 'google': return verifyGoogle(token);
    case 'apple': return verifyApple(token);
    case 'facebook': return verifyFacebook(token);
    default: throw new Error(`Unsupported provider: ${provider}`);
  }
}
