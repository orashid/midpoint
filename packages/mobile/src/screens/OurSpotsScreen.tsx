import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { SavedRestaurant } from '../storage/types';
import { getMyInfo } from '../storage/repository';
import { useOurSpots } from '../hooks/useOurSpots';
import { useDeviceLocation } from '../hooks/useDeviceLocation';
import { SpotCard } from '../components/SpotCard';
import { RestaurantDetail } from '../components/RestaurantDetail';
import { AddRestaurantModal } from '../components/AddRestaurantModal';
import { SpinWheel } from '../components/SpinWheel';
import { SaveToSpotsModal } from '../components/SaveToSpotsModal';
import { OurSpotsHelpModal } from '../components/OurSpotsHelpModal';
import { Restaurant } from '../api/client';
import DateTimePicker from '@react-native-community/datetimepicker';

type SortMode = 'recent' | 'visits' | 'name';

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
    isSpotSaved,
  } = useOurSpots();

  const [homeLat, setHomeLat] = useState<number | undefined>();
  const [homeLng, setHomeLng] = useState<number | undefined>();
  const { location: deviceLocation } = useDeviceLocation();
  // Saved "My Info" wins; otherwise fall back to device GPS so restaurant
  // search and distance chips are still biased near the user.
  const searchLat = homeLat ?? deviceLocation?.lat;
  const searchLng = homeLng ?? deviceLocation?.lng;
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [suggestion, setSuggestion] = useState<SavedRestaurant | null>(null);
  const [showWheel, setShowWheel] = useState(false);
  const [wheelItems, setWheelItems] = useState<SavedRestaurant[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<SavedRestaurant | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saveRestaurant, setSaveRestaurant] = useState<any>(null);
  const [logVisitPlaceId, setLogVisitPlaceId] = useState<string | null>(null);
  const [logVisitDate, setLogVisitDate] = useState(new Date());
  const [showHelp, setShowHelp] = useState(false);

  // Keep selectedSpot in sync with spots data
  useEffect(() => {
    if (selectedSpot) {
      const updated = spots.find((s) => s.placeId === selectedSpot.placeId);
      if (updated) {
        setSelectedSpot(updated);
      } else {
        setSelectedSpot(null);
        setShowDetail(false);
      }
    }
  }, [spots]);

  useEffect(() => {
    getMyInfo().then((info) => {
      if (info) {
        setHomeLat(info.lat);
        setHomeLng(info.lng);
      }
    });
  }, []);

  const filteredSpots = useMemo(() => {
    const list = spots;
    switch (sortMode) {
      case 'visits':
        return [...list].sort((a, b) => b.visits.length - a.visits.length);
      case 'name':
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      case 'recent':
      default:
        return [...list].sort((a, b) => b.dateAdded - a.dateAdded);
    }
  }, [spots, sortMode]);

  // Only show cuisine chips that have spots

  const handlePickForMe = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pick = getSuggestion(searchLat, searchLng);
    setSuggestion(pick);
    setShowWheel(false);
  }, [getSuggestion, searchLat, searchLng]);

  const handleSpinWheel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const eligible = getEligibleForWheel(searchLat, searchLng);
    setWheelItems(eligible);
    setSuggestion(null);
    setShowWheel(true);
  }, [getEligibleForWheel, searchLat, searchLng]);

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

      if (isSpotSaved(restaurant.placeId)) {
        Alert.alert(
          'Already Saved',
          `${restaurant.name} is already in Our Spots.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Replace',
              style: 'destructive',
              onPress: async () => {
                await removeSpot(restaurant.placeId);
                setSaveRestaurant(restaurant);
              },
            },
          ]
        );
        return;
      }

      setSaveRestaurant(restaurant);
    },
    [isSpotSaved, removeSpot]
  );

  const handleLogVisitFromCard = useCallback(
    (placeId: string) => {
      setLogVisitDate(new Date());
      setLogVisitPlaceId(placeId);
    },
    []
  );

  const confirmLogVisit = useCallback(
    async (date: Date) => {
      if (!logVisitPlaceId) return;
      await logVisit(logVisitPlaceId, date.getTime());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLogVisitPlaceId(null);
    },
    [logVisitPlaceId, logVisit]
  );

  const cycleSortMode = useCallback(() => {
    setSortMode((prev) => {
      const modes: SortMode[] = ['recent', 'visits', 'name'];
      const next = modes[(modes.indexOf(prev) + 1) % modes.length];
      return next;
    });
  }, []);

  const sortLabel: Record<SortMode, string> = {
    recent: 'Newest',
    visits: 'Most Visited',
    name: 'A-Z',
  };

  const sortIcon: Record<SortMode, string> = {
    recent: 'time-outline',
    visits: 'checkmark-done',
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
          homeLat={searchLat}
          homeLng={searchLng}
          onSelect={handleAddFromSearch}
          onClose={() => setShowAddModal(false)}
        />
        <SaveToSpotsModal
          visible={!!saveRestaurant}
          restaurant={saveRestaurant}
          onSave={addSpot}
          onClose={() => setSaveRestaurant(null)}
        />
        <OurSpotsHelpModal visible={showHelp} onClose={() => setShowHelp(false)} />
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
            homeLat={searchLat}
            homeLng={searchLng}
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
              <TouchableOpacity
                style={styles.helpButton}
                onPress={() => setShowHelp(true)}
              >
                <Ionicons name="help-circle-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
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

            {/* Stats + Sort */}
            <View style={styles.sortBar}>
              <Text style={styles.statsText}>
                {spots.length} restaurant{spots.length !== 1 ? 's' : ''} · {totalVisits} visit{totalVisits !== 1 ? 's' : ''}
              </Text>
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
        ListEmptyComponent={null}
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
        homeLat={searchLat}
        homeLng={searchLng}
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
        homeLat={searchLat}
        homeLng={searchLng}
        onSelect={handleAddFromSearch}
        onClose={() => setShowAddModal(false)}
      />

      <SaveToSpotsModal
        visible={!!saveRestaurant}
        restaurant={saveRestaurant}
        onSave={addSpot}
        onClose={() => setSaveRestaurant(null)}
      />

      {/* Date Picker Modal for Log Visit */}
      <Modal
        visible={!!logVisitPlaceId}
        transparent
        animationType="fade"
        onRequestClose={() => setLogVisitPlaceId(null)}
      >
        <View style={styles.dateModalOverlay}>
          <View style={styles.dateModalCard}>
            <Text style={styles.dateModalTitle}>When did you visit?</Text>
            <DateTimePicker
              value={logVisitDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={(_, selectedDate) => {
                if (Platform.OS === 'android') {
                  if (selectedDate) {
                    confirmLogVisit(selectedDate);
                  } else {
                    setLogVisitPlaceId(null);
                  }
                } else if (selectedDate) {
                  setLogVisitDate(selectedDate);
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <View style={styles.dateModalButtons}>
                <TouchableOpacity
                  style={styles.dateModalCancel}
                  onPress={() => setLogVisitPlaceId(null)}
                >
                  <Text style={styles.dateModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateModalConfirm}
                  onPress={() => confirmLogVisit(logVisitDate)}
                >
                  <Text style={styles.dateModalConfirmText}>Log Visit</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <OurSpotsHelpModal visible={showHelp} onClose={() => setShowHelp(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  helpButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  statsText: {
    fontSize: 13,
    color: colors.textSecondary,
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
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
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
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dateModalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  dateModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  dateModalCancel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  dateModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dateModalConfirm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  dateModalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
});
