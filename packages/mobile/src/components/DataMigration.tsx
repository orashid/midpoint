import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateLocalData } from '../api/userData';
import { useAuth } from '../context/AuthContext';
import * as cache from '../storage/cache';

const MIGRATION_KEY = '@midpoint/migrated';

/**
 * Invisible component that runs once after first sign-in.
 * Uploads any existing local data to the server.
 */
export function DataMigration() {
  const { isAuthenticated } = useAuth();
  const didRun = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || didRun.current) return;
    didRun.current = true;

    (async () => {
      try {
        // Check if already migrated
        const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
        if (migrated === 'true') return;

        // Gather all local data
        const [spots, people, searches, preferences, myInfo] = await Promise.all([
          cache.getOurSpots(),
          cache.getSavedPeople(),
          cache.getRecentSearches(),
          cache.getPreferences(),
          cache.getMyInfo(),
        ]);

        // Only migrate if there's data
        const hasData = spots.length > 0 || people.length > 0 || searches.length > 0 || preferences || myInfo;
        if (!hasData) {
          await AsyncStorage.setItem(MIGRATION_KEY, 'true');
          return;
        }

        console.log(`[migration] Uploading local data: ${spots.length} spots, ${people.length} people, ${searches.length} searches`);

        await migrateLocalData({
          spots: spots.length > 0 ? spots : undefined,
          people: people.length > 0 ? people : undefined,
          searches: searches.length > 0 ? searches : undefined,
          preferences: preferences || undefined,
          myInfo: myInfo || undefined,
        });

        await AsyncStorage.setItem(MIGRATION_KEY, 'true');
        console.log('[migration] Local data migrated successfully');
      } catch (err) {
        console.warn('[migration] Failed to migrate local data:', err);
        // Don't set the flag — will retry next time
      }
    })();
  }, [isAuthenticated]);

  return null; // Invisible component
}
