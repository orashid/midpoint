import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { CUISINE_TYPES } from '../storage/types';
import { CUISINE_LABELS } from '../theme/cuisine';

const CUISINE_KEYWORDS_MAP: Record<string, string[]> = {
  chinese: ['chinese'],
  indian: ['indian'],
  mexican: ['mexican'],
  italian: ['italian', 'pizza'],
  japanese: ['japanese', 'sushi', 'ramen'],
  thai: ['thai'],
  korean: ['korean'],
  vietnamese: ['vietnamese', 'pho'],
  mediterranean: ['mediterranean', 'greek', 'lebanese', 'turkish', 'middle_eastern'],
  american: ['american', 'hamburger', 'steak'],
};

function detectCuisine(types: string[]): string {
  const typesStr = types.join(' ').toLowerCase();
  for (const [cuisine, keywords] of Object.entries(CUISINE_KEYWORDS_MAP)) {
    if (keywords.some((kw) => typesStr.includes(kw))) return cuisine;
  }
  return 'other';
}

interface Props {
  visible: boolean;
  restaurant: {
    placeId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    photoUrl?: string | null;
    phone?: string | null;
    types?: string[];
  } | null;
  onSave: (data: {
    placeId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    cuisineType: string;
    familyRating: number;
    photoUrl?: string;
    phone?: string | null;
  }) => void;
  onClose: () => void;
}

export function SaveToSpotsModal({ visible, restaurant, onSave, onClose }: Props) {
  const detectedCuisine = useMemo(
    () => (restaurant?.types ? detectCuisine(restaurant.types) : 'other'),
    [restaurant]
  );

  const [cuisineType, setCuisineType] = useState(detectedCuisine);

  // Reset when restaurant changes
  React.useEffect(() => {
    setCuisineType(detectedCuisine);
  }, [detectedCuisine, restaurant]);

  if (!restaurant) return null;

  const handleSave = () => {
    onSave({
      placeId: restaurant.placeId,
      name: restaurant.name,
      address: restaurant.address,
      lat: restaurant.lat,
      lng: restaurant.lng,
      cuisineType,
      // familyRating is no longer collected in the UI but the data layer
      // still expects the field; default to 3 (neutral) so existing code
      // paths keep working.
      familyRating: 3,
      photoUrl: restaurant.photoUrl || undefined,
      phone: restaurant.phone ?? null,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Save to Our Spots</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text style={styles.restaurantAddress}>{restaurant.address}</Text>

          <Text style={styles.sectionLabel}>Cuisine Type</Text>
          <View style={styles.chipRow}>
            {CUISINE_TYPES.map((type) => {
              const isSelected = cuisineType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setCuisineType(type)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {CUISINE_LABELS[type] || type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Ionicons name="heart" size={20} color={colors.textOnPrimary} />
            <Text style={styles.saveButtonText}>Save to Our Spots</Text>
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
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  closeButton: { padding: spacing.xs },
  content: { padding: spacing.lg },
  restaurantName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  restaurantAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextSelected: { color: colors.textOnPrimary, fontWeight: '600' },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  starBtn: { paddingHorizontal: spacing.xs },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textOnPrimary,
    marginLeft: spacing.sm,
  },
});
