import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  FlatList,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { MealType } from '../storage/types';
import { getPreferences, savePreferences, getMyInfo, saveMyInfo } from '../storage/repository';
import { geocode } from '../api/client';

import { ParticipantList } from '../components/ParticipantList';
import { MealTypePicker } from '../components/MealTypePicker';
import { DietaryFilters } from '../components/DietaryFilters';
import { FindButton } from '../components/FindButton';
import { RecentSearchCard } from '../components/RecentSearchCard';
import { ResultsList } from '../components/ResultsList';
import { MapView } from '../components/MapView';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { HelpModal } from '../components/HelpModal';
import { SaveToSpotsModal } from '../components/SaveToSpotsModal';

import { useParticipants } from '../hooks/useParticipants';
import { useSearch } from '../hooks/useSearch';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { useFavoritePeople } from '../hooks/useFavoritePeople';
import { useOurSpots } from '../hooks/useOurSpots';
import { Restaurant } from '../api/client';

export function HomeScreen() {
  const {
    participants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setFromCached,
    loadAll,
    canSearch,
  } = useParticipants();

  const { loading, results, error, performSearch, clearResults } = useSearch();
  const scrollRef = useRef<ScrollView>(null);
  const resultsY = useRef(0);
  const [scrolledPastResults, setScrolledPastResults] = useState(false);
  const { searches, addSearch, togglePin, removeSearch } = useRecentSearches();
  const { people, saveParticipants, removePerson } = useFavoritePeople();

  const { spots, addSpot, isSpotSaved } = useOurSpots();
  const savedPlaceIds = React.useMemo(
    () => new Set(spots.map((s) => s.placeId)),
    [spots]
  );
  const [saveRestaurant, setSaveRestaurant] = useState<Restaurant | null>(null);

  const [mealType, setMealType] = useState<MealType>('lunch');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [cuisineExclusions, setCuisineExclusions] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    getPreferences().then((prefs) => {
      if (prefs) {
        setMealType(prefs.mealType);
        setDietaryRestrictions(prefs.dietaryRestrictions);
        setCuisineExclusions(prefs.cuisineExclusions);
      }
    });
    getMyInfo().then((info) => {
      if (info) {
        updateParticipant(participants[0]?.id, {
          name: info.name,
          address: info.address,
          lat: info.lat,
          lng: info.lng,
        });
      }
    });
  }, []);

  const handleSearch = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const toGeocode = participants.filter((p) => p.address.trim());
      const errors: string[] = [];

      // Geocode any participants that have an address but no coordinates yet
      const withCoords = await Promise.all(
        toGeocode.map(async (p) => {
            const displayName = p.name.trim() || p.defaultLabel;
            if (p.lat !== null && p.lng !== null) {
              return { name: displayName, address: p.address, lat: p.lat, lng: p.lng };
            }
            try {
              const geo = await geocode({ address: p.address.trim() });
              updateParticipant(p.id, {
                lat: geo.lat,
                lng: geo.lng,
                address: geo.formattedAddress,
              });
              return { name: displayName, address: geo.formattedAddress, lat: geo.lat, lng: geo.lng };
            } catch (e: any) {
              errors.push(`${displayName} ("${p.address}"): ${e.message} | code: ${e.code || 'none'}`);
              return null;
            }
          })
      );

      const validParticipants = withCoords.filter((p): p is NonNullable<typeof p> => p !== null);

      if (validParticipants.length < 2) {
        Alert.alert(
          'Could not find locations',
          `Found ${toGeocode.length} entries, geocoded ${validParticipants.length}.\n\nErrors:\n${errors.join('\n\n') || 'No errors captured'}`
        );
        clearResults();
        return;
      }

    const result = await performSearch({
      participants: validParticipants,
      mealType,
      dietaryRestrictions: dietaryRestrictions.length > 0 ? dietaryRestrictions : undefined,
      cuisineExclusions: cuisineExclusions.length > 0 ? cuisineExclusions : undefined,
    });

    if (result) {
      // Scroll to results
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: resultsY.current, animated: true });
      }, 300);

      // Cache everything
      await saveParticipants(validParticipants);
      await addSearch({
        participants: validParticipants,
        mealType,
        dietaryRestrictions,
        cuisineExclusions,
      });
      await savePreferences({ mealType, dietaryRestrictions, cuisineExclusions });

      // Save first participant as "me" if not already saved
      const myInfo = await getMyInfo();
      if (!myInfo && validParticipants.length > 0) {
        await saveMyInfo(validParticipants[0]);
      }
    }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    }
  }, [participants, mealType, dietaryRestrictions, cuisineExclusions, performSearch, saveParticipants, addSearch, updateParticipant, clearResults]);

  const handleRecentSearch = useCallback(
    (search: typeof searches[0]) => {
      loadAll(search.participants);
      setMealType(search.mealType);
      setDietaryRestrictions(search.dietaryRestrictions);
      setCuisineExclusions(search.cuisineExclusions);

      // Auto-trigger search
      setTimeout(() => {
        performSearch({
          participants: search.participants,
          mealType: search.mealType,
          dietaryRestrictions: search.dietaryRestrictions.length > 0 ? search.dietaryRestrictions : undefined,
          cuisineExclusions: search.cuisineExclusions.length > 0 ? search.cuisineExclusions : undefined,
        });
      }, 100);
    },
    [loadAll, performSearch]
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {loading && <LoadingOverlay />}

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            setScrolledPastResults(y > resultsY.current - 100);
          }}
          scrollEventThrottle={16}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => setShowHelp(true)}
            >
              <Ionicons name="help-circle-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.headerIcon}>
              <Ionicons name="location" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>Midpoint</Text>
            <Text style={styles.subtitle}>Find a fair spot to meet in the middle</Text>
          </View>

          {/* Recent Searches */}
          {searches.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.recentTitle}>Recent</Text>
              <FlatList
                horizontal
                data={searches.slice(0, 5)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <RecentSearchCard
                    search={item}
                    onPress={() => handleRecentSearch(item)}
                    onTogglePin={() => togglePin(item.id)}
                    onDelete={() => removeSearch(item.id)}
                  />
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentList}
              />
            </View>
          )}

          {/* Participant Inputs */}
          <ParticipantList
            participants={participants}
            savedPeople={people}
            onUpdate={updateParticipant}
            onSetFromCached={setFromCached}
            onRemove={removeParticipant}
            onAdd={addParticipant}
            onRemovePerson={removePerson}
          />

          {/* Meal Type */}
          <MealTypePicker selected={mealType} onSelect={setMealType} />

          {/* Filters */}
          <DietaryFilters
            dietaryRestrictions={dietaryRestrictions}
            cuisineExclusions={cuisineExclusions}
            onDietaryChange={setDietaryRestrictions}
            onCuisineChange={setCuisineExclusions}
          />

          {/* Search Button */}
          <FindButton
            onPress={handleSearch}
            disabled={!canSearch}
            loading={loading}
          />

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Results */}
          {results && results.restaurants.length > 0 && (
            <View onLayout={(e) => { resultsY.current = e.nativeEvent.layout.y; }}>
              <MapView
                midpoint={results.midpoint}
                restaurants={results.restaurants}
                participants={participants}
              />
              <ResultsList
                restaurants={results.restaurants}
                savedPlaceIds={savedPlaceIds}
                onToggleSave={(r) => {
                  if (isSpotSaved(r.placeId)) return;
                  setSaveRestaurant(r);
                }}
              />

              {/* New Search button at bottom of results */}
              <TouchableOpacity
                style={styles.newSearchButton}
                onPress={() => {
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text style={styles.newSearchText}>Modify Search</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Floating "New Search" button when results are visible */}
        {results && results.restaurants.length > 0 && scrolledPastResults && (
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => {
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color={colors.textOnPrimary} />
            <Text style={styles.floatingButtonText}>Modify Search</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} />
      <SaveToSpotsModal
        visible={!!saveRestaurant}
        restaurant={saveRestaurant}
        onSave={addSpot}
        onClose={() => setSaveRestaurant(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  helpButton: {
    position: 'absolute',
    top: spacing.md,
    right: 0,
    padding: spacing.xs,
    zIndex: 1,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recentSection: {
    marginBottom: spacing.md,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recentList: {
    paddingRight: spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginLeft: spacing.sm,
    flex: 1,
  },
  bottomSpacer: { height: spacing.xxl },
  newSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  newSearchText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    minHeight: 48,
  },
  floatingButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textOnPrimary,
    marginLeft: spacing.sm,
  },
});
