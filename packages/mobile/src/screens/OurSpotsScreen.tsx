import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { SavedRestaurant, CUISINE_TYPES } from '../storage/types';
import { getMyInfo } from '../storage/cache';
import { useOurSpots } from '../hooks/useOurSpots';
import { SpotCard } from '../components/SpotCard';
import { RestaurantDetail } from '../components/RestaurantDetail';
import { AddRestaurantModal } from '../components/AddRestaurantModal';
import { SpinWheel } from '../components/SpinWheel';
import { SaveToSpotsModal } from '../components/SaveToSpotsModal';
import { Restaurant } from '../api/client';

const CUISINE_LABELS: Record<string, string> = {
  all: 'All',
  chinese: 'Chinese',
  indian: 'Indian',
  mexican: 'Mexican',
  italian: 'Italian',
  japanese: 'Japanese',
  thai: 'Thai',
  korean: 'Korean',
  vietnamese: 'Vietnamese',
  mediterranean: 'Mediterranean',
  american: 'American',
  other: 'Other',
};

type SortMode = 'recent' | 'rating' | 'name';

export function OurSpotsScreen() {
  const {
    spots,
    loading,
    addSpot,
    removeSpot,
    updateRating,
    updateCuisine,
    logVisit,
    removeVisit,
    totalVisits,
    getSuggestion,
    getEligibleForWheel,
  } = useOurSpots();

  const [homeLat, setHomeLat] = useState<number | undefined>();
  const [homeLng, setHomeLng] = useState<number | undefined>();
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [suggestion, setSuggestion] = useState<SavedRestaurant | null>(null);
  const [showWheel, setShowWheel] = useState(false);
  const [wheelItems, setWheelItems] = useState<SavedRestaurant[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<SavedRestaurant | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saveRestaurant, setSaveRestaurant] = useState<any>(null);

  useEffect(() => {
    getMyInfo().then((info) => {
      if (info) {
        setHomeLat(info.lat);
        setHomeLng(info.lng);
      }
    });
  }, []);

  const filteredSpots = useMemo(() => {
    let list = spots;
    if (cuisineFilter !== 'all') {
      list = list.filter((s) => s.cuisineType === cuisineFilter);
    }
    switch (sortMode) {
      case 'rating':
        return [...list].sort((a, b) => b.familyRating - a.familyRating);
      case 'name':
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      case 'recent':
      default:
        return [...list].sort((a, b) => b.dateAdded - a.dateAdded);
    }
  }, [spots, cuisineFilter, sortMode]);

  // Only show cuisine chips that have spots
  const activeCuisines = useMemo(() => {
    const types = new Set(spots.map((s) => s.cuisineType));
    return ['all', ...CUISINE_TYPES.filter((t) => types.has(t))];
  }, [spots]);

  const handlePickForMe = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pick = getSuggestion(homeLat, homeLng);
    setSuggestion(pick);
    setShowWheel(false);
  }, [getSuggestion, homeLat, homeLng]);

  const handleSpinWheel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const eligible = getEligibleForWheel(homeLat, homeLng);
    setWheelItems(eligible);
    setSuggestion(null);
    setShowWheel(true);
  }, [getEligibleForWheel, homeLat, homeLng]);

  const handleWheelResult = useCallback((restaurant: SavedRestaurant) => {
    setSuggestion(restaurant);
    setShowWheel(false);
  }, []);

  const handleAddFromSearch = useCallback(
    (restaurant: {
      placeId: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
      types: string[];
      photoUrl?: string | null;
    }) => {
      setShowAddModal(false);
      setSaveRestaurant(restaurant);
    },
    []
  );

  const handleLogVisitFromCard = useCallback(
    async (placeId: string) => {
      await logVisit(placeId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [logVisit]
  );

  const cycleSortMode = useCallback(() => {
    setSortMode((prev) => {
      const modes: SortMode[] = ['recent', 'rating', 'name'];
      const next = modes[(modes.indexOf(prev) + 1) % modes.length];
      return next;
    });
  }, []);

  const sortLabel: Record<SortMode, string> = {
    recent: 'Newest',
    rating: 'Top Rated',
    name: 'A-Z',
  };

  const sortIcon: Record<SortMode, string> = {
    recent: 'time-outline',
    rating: 'star-outline',
    name: 'text-outline',
  };

  // Empty state
  if (!loading && spots.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Our Spots</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="heart-outline" size={48} color={colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>No restaurants saved yet</Text>
          <Text style={styles.emptySubtext}>
            Save your favorite family restaurants here. Add them manually or tap the heart icon on search results.
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color={colors.textOnPrimary} />
            <Text style={styles.emptyAddText}>Add Restaurant</Text>
          </TouchableOpacity>
        </View>
        <AddRestaurantModal
          visible={showAddModal}
          homeLat={homeLat}
          homeLng={homeLng}
          onSelect={handleAddFromSearch}
          onClose={() => setShowAddModal(false)}
        />
        <SaveToSpotsModal
          visible={!!saveRestaurant}
          restaurant={saveRestaurant}
          onSave={addSpot}
          onClose={() => setSaveRestaurant(null)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <FlatList
        data={filteredSpots}
        keyExtractor={(item) => item.placeId}
        renderItem={({ item }) => (
          <SpotCard
            spot={item}
            homeLat={homeLat}
            homeLng={homeLng}
            onPress={() => {
              setSelectedSpot(item);
              setShowDetail(true);
            }}
            onLogVisit={() => handleLogVisitFromCard(item.placeId)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Our Spots</Text>
              <Text style={styles.headerStats}>
                {spots.length} restaurant{spots.length !== 1 ? 's' : ''} · {totalVisits} visit{totalVisits !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Suggestion Card */}
            <LinearGradient
              colors={['#4A90D9', '#6BA3E0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.suggestionCard}
            >
              <Text style={styles.suggestionTitle}>Where should we eat?</Text>

              <View style={styles.suggestionButtons}>
                <TouchableOpacity
                  style={styles.suggestionBtn}
                  onPress={handlePickForMe}
                >
                  <Ionicons name="shuffle" size={18} color={colors.primary} />
                  <Text style={styles.suggestionBtnText}>Pick for me</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.suggestionBtn}
                  onPress={handleSpinWheel}
                >
                  <Ionicons name="sync" size={18} color={colors.primary} />
                  <Text style={styles.suggestionBtnText}>Spin the wheel</Text>
                </TouchableOpacity>
              </View>

              {showWheel && (
                <View style={styles.wheelWrapper}>
                  <SpinWheel
                    restaurants={wheelItems}
                    onResult={handleWheelResult}
                    onClose={() => setShowWheel(false)}
                  />
                </View>
              )}

              {suggestion && !showWheel && (
                <View style={styles.suggestionResult}>
                  <Ionicons name="trophy" size={20} color={colors.accent} />
                  <View style={styles.suggestionResultInfo}>
                    <Text style={styles.suggestionResultName}>{suggestion.name}</Text>
                    <Text style={styles.suggestionResultAddress} numberOfLines={1}>
                      {suggestion.address}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.ateHereBtn}
                    onPress={() => handleLogVisitFromCard(suggestion.placeId)}
                  >
                    <Text style={styles.ateHereBtnText}>Log Visit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>

            {/* Filter Bar */}
            <View style={styles.filterBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {activeCuisines.map((cuisine) => {
                  const active = cuisineFilter === cuisine;
                  return (
                    <TouchableOpacity
                      key={cuisine}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setCuisineFilter(cuisine)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {CUISINE_LABELS[cuisine] || cuisine}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity style={styles.sortButton} onPress={cycleSortMode}>
                <Ionicons
                  name={sortIcon[sortMode] as any}
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.sortText}>{sortLabel[sortMode]}</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          cuisineFilter !== 'all' ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>
                No {CUISINE_LABELS[cuisineFilter]} restaurants saved
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={colors.textOnPrimary} />
      </TouchableOpacity>

      {/* Modals */}
      <RestaurantDetail
        visible={showDetail}
        restaurant={selectedSpot}
        homeLat={homeLat}
        homeLng={homeLng}
        onClose={() => {
          setShowDetail(false);
          setSelectedSpot(null);
        }}
        onUpdateRating={updateRating}
        onUpdateCuisine={updateCuisine}
        onLogVisit={logVisit}
        onRemoveVisit={removeVisit}
        onRemove={removeSpot}
      />

      <AddRestaurantModal
        visible={showAddModal}
        homeLat={homeLat}
        homeLng={homeLng}
        onSelect={handleAddFromSearch}
        onClose={() => setShowAddModal(false)}
      />

      <SaveToSpotsModal
        visible={!!saveRestaurant}
        restaurant={saveRestaurant}
        onSave={addSpot}
        onClose={() => setSaveRestaurant(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerStats: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  suggestionCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  suggestionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textOnPrimary,
    marginBottom: spacing.md,
  },
  suggestionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  suggestionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs,
  },
  suggestionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  wheelWrapper: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  suggestionResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  suggestionResultInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  suggestionResultName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  suggestionResultAddress: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  ateHereBtn: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginLeft: spacing.sm,
  },
  ateHereBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 4,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  noResults: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textLight,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  emptyAddText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});
