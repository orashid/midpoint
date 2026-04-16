import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { Restaurant, resolvePhotoUrl } from '../api/client';

interface Props {
  restaurant: Restaurant;
  index: number;
  isSaved?: boolean;
  onToggleSave?: (restaurant: Restaurant) => void;
}

function renderStars(rating: number) {
  const stars = [];
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  for (let i = 0; i < full; i++) {
    stars.push(<Ionicons key={`f${i}`} name="star" size={14} color={colors.accent} />);
  }
  if (half) {
    stars.push(<Ionicons key="h" name="star-half" size={14} color={colors.accent} />);
  }
  return stars;
}

function renderPriceLevel(level: number) {
  return '$'.repeat(level || 1);
}

export function ResultCard({ restaurant, index, isSaved, onToggleSave }: Props) {
  const openDetails = () => {
    // Opens Google Maps place page with full details (reviews, hours, phone, menu, etc.)
    const query = encodeURIComponent(restaurant.name);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${restaurant.placeId}`;
    Linking.openURL(url);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={openDetails} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{index + 1}</Text>
        </View>
        <View style={styles.titleArea}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View style={styles.ratingRow}>
            {renderStars(restaurant.rating ?? 0)}
            <Text style={styles.ratingText}>{restaurant.rating?.toFixed(1)}</Text>
            <Text style={styles.priceText}>{renderPriceLevel(restaurant.priceLevel)}</Text>
          </View>
        </View>
        {onToggleSave && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onToggleSave(restaurant);
            }}
            style={styles.heartBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={22}
              color={isSaved ? colors.error : colors.textLight}
            />
          </TouchableOpacity>
        )}
        {restaurant.photoUrl && (
          <Image source={{ uri: resolvePhotoUrl(restaurant.photoUrl)! }} style={styles.photo} />
        )}
      </View>

      <Text style={styles.address} numberOfLines={1}>
        {restaurant.address}
      </Text>

      <View style={styles.distancesContainer}>
        {restaurant.distancesFromParticipants.map((d) => (
          <View key={d.participantName} style={styles.distanceRow}>
            <Ionicons name="car-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.distanceName}>{d.participantName}</Text>
            <Text style={styles.distanceValue}>{d.durationText}</Text>
            <Text style={styles.distanceMiles}>{d.distanceText}</Text>
          </View>
        ))}
      </View>

      <View style={styles.openDetailsRow}>
        <Ionicons name="open-outline" size={14} color={colors.primary} />
        <Text style={styles.openDetailsText}>View Details</Text>
      </View>
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  rankText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  titleArea: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  ratingText: { fontSize: 13, color: colors.textSecondary, marginLeft: 4 },
  priceText: { fontSize: 13, color: colors.textLight, marginLeft: spacing.sm },
  heartBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  address: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  distancesContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  distanceName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginLeft: spacing.xs,
  },
  distanceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  distanceMiles: {
    fontSize: 12,
    color: colors.textLight,
    width: 55,
    textAlign: 'right',
  },
  openDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  openDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: spacing.xs,
  },
});
