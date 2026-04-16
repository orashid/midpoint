import dotenv from 'dotenv';
import path from 'path';

// Try loading .env for local dev; on Railway, env vars are set directly
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // also try CWD

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',

  // OAuth Client IDs (for token validation)
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  appleClientId: process.env.APPLE_CLIENT_ID || '',           // e.g. "com.yourapp.midpoint"
  facebookAppId: process.env.FACEBOOK_APP_ID || '',
};
