import fs from 'fs';
import path from 'path';
import { query } from './index';

export async function runMigrations() {
  // Create migrations tracking table
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  // In dev: __dirname is src/db, migrations are at src/db/migrations
  // In prod: __dirname is dist/db, but SQL files are copied to dist/db/migrations
  let migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    // Fallback: try the source directory
    migrationsDir = path.join(__dirname, '../../src/db/migrations');
  }
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const { rows: applied } = await query('SELECT name FROM _migrations');
  const appliedSet = new Set(applied.map((r: any) => r.name));

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    console.log(`[migrate] Applying ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await query(sql);
    await query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    console.log(`[migrate] Applied ${file}`);
  }

  console.log('[migrate] All migrations up to date');
}
