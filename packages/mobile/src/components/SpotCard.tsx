import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { SavedRestaurant } from '../storage/types';
import { haversineDistance, formatDistance } from '../utils/geo';

const CUISINE_COLORS: Record<string, string> = {
  chinese: '#E74C3C',
  indian: '#F39C12',
  mexican: '#2ECC71',
  italian: '#3498DB',
  japanese: '#E91E63',
  thai: '#9B59B6',
  korean: '#E67E22',
  vietnamese: '#1ABC9C',
  mediterranean: '#2980B9',
  american: '#34495E',
  other: '#95A5A6',
};

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

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

interface Props {
  spot: SavedRestaurant;
  homeLat?: number;
  homeLng?: number;
  onPress: () => void;
  onLogVisit: () => void;
}

export function SpotCard({ spot, homeLat, homeLng, onPress, onLogVisit }: Props) {
  const lastVisit = spot.visits.length > 0
    ? Math.max(...spot.visits.map((v) => v.date))
    : null;

  const distance = homeLat !== undefined && homeLng !== undefined
    ? haversineDistance(homeLat, homeLng, spot.lat, spot.lng)
    : null;

  const cuisineColor = CUISINE_COLORS[spot.cuisineType] || CUISINE_COLORS.other;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <View style={[styles.cuisineBadge, { backgroundColor: cuisineColor + '20' }]}>
          <Text style={[styles.cuisineText, { color: cuisineColor }]}>
            {CUISINE_LABELS[spot.cuisineType] || spot.cuisineType}
          </Text>
        </View>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons
              key={s}
              name={s <= spot.familyRating ? 'star' : 'star-outline'}
              size={14}
              color={s <= spot.familyRating ? colors.accent : colors.textLight}
            />
          ))}
        </View>
      </View>

      <Text style={styles.name} numberOfLines={1}>{spot.name}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {lastVisit ? timeAgo(lastVisit) : 'Never visited'}
          </Text>
        </View>
        {spot.visits.length > 0 && (
          <View style={styles.metaItem}>
            <Ionicons name="checkmark-done" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{spot.visits.length} visits</Text>
          </View>
        )}
        {distance !== null && (
          <View style={styles.metaItem}>
            <Ionicons name="navigate-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.metaText}>{formatDistance(distance)}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.visitButton}
        onPress={(e) => {
          e.stopPropagation();
          onLogVisit();
        }}
      >
        <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
        <Text style={styles.visitButtonText}>Log Visit</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cuisineBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  cuisineText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  starsRow: { flexDirection: 'row' },
  name: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    marginBottom: 2,
  },
  metaText: { fontSize: 12, color: colors.textSecondary, marginLeft: 3 },
  visitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  visitButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: spacing.xs,
  },
});
