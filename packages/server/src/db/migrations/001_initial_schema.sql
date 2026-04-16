-- Users table: one row per authenticated user
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider      TEXT NOT NULL,
  provider_sub  TEXT NOT NULL,
  email         TEXT,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, provider_sub)
);

-- Saved restaurants ("Our Spots")
CREATE TABLE saved_restaurants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id      TEXT NOT NULL,
  name          TEXT NOT NULL,
  address       TEXT NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  cuisine_type  TEXT NOT NULL DEFAULT 'other',
  family_rating SMALLINT NOT NULL DEFAULT 3,
  photo_url     TEXT,
  date_added    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, place_id)
);
CREATE INDEX idx_saved_restaurants_user ON saved_restaurants(user_id);

-- Visits to saved restaurants
CREATE TABLE visits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES saved_restaurants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visited_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visits_restaurant ON visits(restaurant_id);
CREATE INDEX idx_visits_user ON visits(user_id);

-- Favorite/cached people
CREATE TABLE saved_people (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  address    TEXT NOT NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  use_count  INTEGER NOT NULL DEFAULT 1,
  last_used  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_saved_people_user ON saved_people(user_id);
-- Case-insensitive uniqueness on (user_id, name, address). Postgres table
-- UNIQUE constraints can't use expressions like lower(name), so we use a
-- unique expression index instead.
CREATE UNIQUE INDEX uq_saved_people_user_name_address
  ON saved_people (user_id, lower(name), address);

-- Recent searches
CREATE TABLE recent_searches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participants          JSONB NOT NULL,
  meal_type             TEXT NOT NULL,
  dietary_restrictions  TEXT[] DEFAULT '{}',
  cuisine_exclusions    TEXT[] DEFAULT '{}',
  pinned                BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_recent_searches_user ON recent_searches(user_id);

-- User preferences (one row per user, includes "my info")
CREATE TABLE user_preferences (
  user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  meal_type             TEXT NOT NULL DEFAULT 'dinner',
  dietary_restrictions  TEXT[] DEFAULT '{}',
  cuisine_exclusions    TEXT[] DEFAULT '{}',
  my_name               TEXT,
  my_address            TEXT,
  my_lat                DOUBLE PRECISION,
  my_lng                DOUBLE PRECISION
);
