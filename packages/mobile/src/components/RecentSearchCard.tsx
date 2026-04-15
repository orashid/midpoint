import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { RecentSearch } from '../storage/types';

interface Props {
  search: RecentSearch;
  onPress: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}

const MEAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  coffee: 'cafe',
  lunch: 'restaurant',
  dinner: 'wine',
};

const MEAL_COLORS: Record<string, string> = {
  coffee: colors.coffee,
  lunch: colors.lunch,
  dinner: colors.dinner,
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function RecentSearchCard({ search, onPress, onTogglePin, onDelete }: Props) {
  const names = search.participants.map((p) => p.name || 'Someone').join(', ');
  const mealColor = MEAL_COLORS[search.mealType] || colors.textSecondary;

  const handleLongPress = () => {
    Alert.alert('Remove Entry', `Remove this recent search?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} onLongPress={handleLongPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <Ionicons
          name={MEAL_ICONS[search.mealType] || 'restaurant'}
          size={18}
          color={mealColor}
        />
        <Text style={[styles.mealLabel, { color: mealColor }]}>
          {search.mealType.charAt(0).toUpperCase() + search.mealType.slice(1)}
        </Text>
        <TouchableOpacity onPress={onTogglePin} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name={search.pinned ? 'bookmark' : 'bookmark-outline'}
            size={16}
            color={search.pinned ? colors.accent : colors.textLight}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.names} numberOfLines={1}>
        {names}
      </Text>
      <Text style={styles.time}>{timeAgo(search.timestamp)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginRight: spacing.sm,
    width: 160,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  mealLabel: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    marginLeft: spacing.xs,
  },
  names: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  time: {
    fontSize: 11,
    color: colors.textLight,
  },
});
