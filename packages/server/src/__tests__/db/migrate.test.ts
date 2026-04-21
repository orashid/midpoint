import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('migrations', () => {
  const migrationsDir = path.join(__dirname, '../../db/migrations');

  it('should have a migrations directory', () => {
    expect(fs.existsSync(migrationsDir)).toBe(true);
  });

  it('should contain only .sql files', () => {
    const files = fs.readdirSync(migrationsDir);
    const nonSql = files.filter((f) => !f.endsWith('.sql'));
    expect(nonSql).toEqual([]);
  });

  it('should have migration files with numbered prefixes', () => {
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).toMatch(/^\d{3}_/);
    }
  });

  it('should have migration files that sort in the correct order', () => {
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
    expect(files[0]).toMatch(/^001_/);
  });

  it('should have valid SQL in each migration file', () => {
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      expect(sql.length).toBeGreaterThan(0);
      expect(sql.toUpperCase()).toMatch(/CREATE|ALTER|INSERT|UPDATE|DROP/);
    }
  });

  it('should have runMigrations exported from migrate module', async () => {
    const mod = await import('../../db/migrate');
    expect(typeof mod.runMigrations).toBe('function');
  });

  it('002 migration is wrapped in a transaction so rename + reset apply atomically', () => {
    const sql = fs.readFileSync(
      path.join(migrationsDir, '002_flip_cuisine_and_phone.sql'),
      'utf-8'
    );
    expect(sql).toMatch(/^\s*BEGIN\s*;/);
    expect(sql.trim().endsWith('COMMIT;')).toBe(true);
    // IF NOT EXISTS keeps the column add idempotent if a partial prior run left the schema half-applied.
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS phone/);
  });
});
