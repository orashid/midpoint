import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  StyleSheet,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { SavedRestaurant, CUISINE_TYPES } from '../storage/types';
import { haversineDistance, formatDistance } from '../utils/geo';

const CUISINE_LABELS: Record<string, string> = {
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

interface Props {
  visible: boolean;
  restaurant: SavedRestaurant | null;
  homeLat?: number;
  homeLng?: number;
  onClose: () => void;
  onUpdateRating: (placeId: string, rating: number) => void;
  onUpdateCuisine: (placeId: string, cuisineType: string) => void;
  onLogVisit: (placeId: string, date?: number) => void;
  onRemoveVisit: (placeId: string, visitDate: number) => void;
  onRemove: (placeId: string) => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function RestaurantDetail({
  visible,
  restaurant,
  homeLat,
  homeLng,
  onClose,
  onUpdateRating,
  onUpdateCuisine,
  onLogVisit,
  onRemoveVisit,
  onRemove,
}: Props) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [visitDate, setVisitDate] = useState(new Date());

  if (!restaurant) return null;

  const distance =
    homeLat !== undefined && homeLng !== undefined
      ? haversineDistance(homeLat, homeLng, restaurant.lat, restaurant.lng)
      : null;

  const sortedVisits = [...restaurant.visits].sort((a, b) => b.date - a.date);

  const handleRemove = () => {
    Alert.alert('Remove Restaurant', `Remove ${restaurant.name} from Our Spots?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          onRemove(restaurant.placeId);
          onClose();
        },
      },
    ]);
  };

  const openInMaps = () => {
    const query = encodeURIComponent(restaurant.name);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${restaurant.placeId}`;
    Linking.openURL(url);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Restaurant Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {restaurant.photoUrl && (
            <Image source={{ uri: restaurant.photoUrl }} style={styles.photo} />
          )}

          <Text style={styles.name}>{restaurant.name}</Text>
          <Text style={styles.address}>{restaurant.address}</Text>

          {distance !== null && (
            <View style={styles.distanceRow}>
              <Ionicons name="navigate-outline" size={16} color={colors.primary} />
              <Text style={styles.distanceText}>{formatDistance(distance)} from home</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>Cuisine Type</Text>
          <View style={styles.cuisineChipRow}>
            {CUISINE_TYPES.map((type) => {
              const isSelected = restaurant.cuisineType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.cuisineChip, isSelected && styles.cuisineChipSelected]}
                  onPress={() => onUpdateCuisine(restaurant.placeId, type)}
                >
                  <Text style={[styles.cuisineChipText, isSelected && styles.cuisineChipTextSelected]}>
                    {CUISINE_LABELS[type] || type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Family Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => onUpdateRating(restaurant.placeId, star)}
                style={styles.starBtn}
              >
                <Ionicons
                  name={star <= restaurant.familyRating ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= restaurant.familyRating ? colors.accent : colors.textLight}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.visitButton}
            onPress={() => {
              setVisitDate(new Date());
              setShowDatePicker(true);
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color={colors.textOnPrimary} />
            <Text style={styles.visitButtonText}>Log Visit</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.datePickerCard}>
              <Text style={styles.datePickerLabel}>When did you visit?</Text>
              <DateTimePicker
                value={visitDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={(_, selectedDate) => {
                  if (Platform.OS === 'android') {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      onLogVisit(restaurant.placeId, selectedDate.getTime());
                    }
                  } else if (selectedDate) {
                    setVisitDate(selectedDate);
                  }
                }}
                style={styles.datePicker}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity
                    style={styles.datePickerCancel}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.datePickerConfirm}
                    onPress={() => {
                      onLogVisit(restaurant.placeId, visitDate.getTime());
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={styles.datePickerConfirmText}>Log Visit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <Text style={styles.sectionLabel}>
            Visit History ({restaurant.visits.length})
          </Text>
          {sortedVisits.length === 0 ? (
            <Text style={styles.noVisits}>No visits logged yet</Text>
          ) : (
            sortedVisits.map((v, i) => (
              <View key={i} style={styles.visitItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.visitDate}>{formatDate(v.date)}</Text>
                <TouchableOpacity
                  style={styles.visitDeleteBtn}
                  onPress={() => {
                    Alert.alert('Remove Visit', `Remove visit on ${formatDate(v.date)}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => onRemoveVisit(restaurant.placeId, v.date),
                      },
                    ]);
                  }}
                >
                  <Ionicons name="close-circle-outline" size={18} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.mapsLink} onPress={openInMaps}>
            <Ionicons name="open-outline" size={16} color={colors.primary} />
            <Text style={styles.mapsLinkText}>View on Google Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={styles.removeButtonText}>Remove from Our Spots</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  closeButton: { padding: spacing.xs },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  name: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  address: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  distanceText: { fontSize: 14, color: colors.primary, fontWeight: '600', marginLeft: spacing.xs },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  cuisineChipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  cuisineChip: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  cuisineChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cuisineChipText: { fontSize: 13, color: colors.textSecondary },
  cuisineChipTextSelected: { color: colors.textOnPrimary, fontWeight: '600' },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  starBtn: { paddingHorizontal: spacing.xs },
  visitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  visitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textOnPrimary,
    marginLeft: spacing.sm,
  },
  datePickerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  datePicker: {
    alignSelf: 'center',
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  datePickerCancel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  datePickerCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  datePickerConfirm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  datePickerConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textOnPrimary,
  },
  noVisits: { fontSize: 14, color: colors.textLight, fontStyle: 'italic' },
  visitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  visitDate: { fontSize: 14, color: colors.text, marginLeft: spacing.sm, flex: 1 },
  visitDeleteBtn: { padding: spacing.xs },
  mapsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  mapsLinkText: { fontSize: 14, fontWeight: '600', color: colors.primary, marginLeft: spacing.xs },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  removeButtonText: { fontSize: 14, fontWeight: '600', color: colors.error, marginLeft: spacing.xs },
});
