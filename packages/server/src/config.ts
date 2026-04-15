import dotenv from 'dotenv';
import path from 'path';

// Try loading .env for local dev; on Railway, env vars are set directly
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // also try CWD

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
};
