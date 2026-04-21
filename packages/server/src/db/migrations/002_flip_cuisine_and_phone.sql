BEGIN;

-- Flip cuisine filter: exclusions -> inclusions. Semantics are inverted,
-- so existing data is meaningless under the new model; reset to empty.
ALTER TABLE user_preferences RENAME COLUMN cuisine_exclusions TO cuisine_inclusions;
UPDATE user_preferences SET cuisine_inclusions = '{}';

ALTER TABLE recent_searches RENAME COLUMN cuisine_exclusions TO cuisine_inclusions;
UPDATE recent_searches SET cuisine_inclusions = '{}';

-- Phone number on saved spots (fetched from Places API, nullable for legacy rows).
ALTER TABLE saved_restaurants ADD COLUMN IF NOT EXISTS phone TEXT;

COMMIT;
