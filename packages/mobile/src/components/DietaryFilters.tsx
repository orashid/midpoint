import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

const DIETARY_OPTIONS = [
  { key: 'vegetarian', label: 'Vegetarian', icon: 'leaf' },
  { key: 'vegan', label: 'Vegan', icon: 'nutrition' },
  { key: 'gluten_free', label: 'Gluten-Free', icon: 'ban' },
  { key: 'halal', label: 'Halal', icon: 'checkmark-circle' },
  { key: 'kosher', label: 'Kosher', icon: 'star' },
] as const;

const CUISINE_OPTIONS = [
  'Chinese', 'Indian', 'Mexican', 'Italian', 'Japanese',
  'Thai', 'Korean', 'Vietnamese', 'Mediterranean', 'American', 'Fast Food',
];

interface Props {
  dietaryRestrictions: string[];
  cuisineInclusions: string[];
  brandQuery: string;
  onDietaryChange: (restrictions: string[]) => void;
  onCuisineChange: (inclusions: string[]) => void;
  onBrandChange: (brand: string) => void;
}

export function DietaryFilters({
  dietaryRestrictions,
  cuisineInclusions,
  brandQuery,
  onDietaryChange,
  onCuisineChange,
  onBrandChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const brandActive = brandQuery.trim().length > 0;
  const filterCount =
    (brandActive ? 1 : 0) + dietaryRestrictions.length + cuisineInclusions.length;
  const hasFilters = filterCount > 0;

  const toggleDietary = (key: string) => {
    if (dietaryRestrictions.includes(key)) {
      onDietaryChange(dietaryRestrictions.filter((d) => d !== key));
    } else {
      onDietaryChange([...dietaryRestrictions, key]);
    }
  };

  const toggleCuisine = (cuisine: string) => {
    const key = cuisine.toLowerCase().replace(/\s+/g, '_');
    if (cuisineInclusions.includes(key)) {
      onCuisineChange(cuisineInclusions.filter((c) => c !== key));
    } else {
      onCuisineChange([...cuisineInclusions, key]);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)}>
        <View style={styles.headerLeft}>
          <Ionicons name="options-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.headerText}>Filters</Text>
          {hasFilters && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          <Text style={styles.subsectionTitle}>Have somewhere in mind?</Text>
          <View style={[styles.brandField, brandActive && styles.brandFieldActive]}>
            <Ionicons
              name="storefront-outline"
              size={16}
              color={brandActive ? colors.primary : colors.textSecondary}
            />
            <TextInput
              style={styles.brandInput}
              value={brandQuery}
              onChangeText={onBrandChange}
              placeholder="e.g., Starbucks, Chipotle"
              placeholderTextColor={colors.textLight}
              autoCapitalize="words"
              returnKeyType="done"
            />
            {brandActive && (
              <TouchableOpacity onPress={() => onBrandChange('')}>
                <Ionicons name="close-circle" size={16} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.subsectionTitle}>Dietary Needs</Text>
          <View style={styles.chipRow}>
            {DIETARY_OPTIONS.map(({ key, label, icon }) => {
              const isActive = dietaryRestrictions.includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, isActive && styles.chipActive, brandActive && styles.chipDisabled]}
                  onPress={() => !brandActive && toggleDietary(key)}
                  disabled={brandActive}
                >
                  <Ionicons
                    name={icon as any}
                    size={14}
                    color={isActive ? colors.textOnPrimary : colors.textSecondary}
                  />
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.subsectionTitle}>Cuisines</Text>
          <View style={styles.chipRow}>
            {CUISINE_OPTIONS.map((cuisine) => {
              const isActive = cuisineInclusions.includes(cuisine.toLowerCase().replace(/\s+/g, '_'));
              return (
                <TouchableOpacity
                  key={cuisine}
                  style={[styles.chip, isActive && styles.chipActive, brandActive && styles.chipDisabled]}
                  onPress={() => !brandActive && toggleCuisine(cuisine)}
                  disabled={brandActive}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {cuisine}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {brandActive && (
            <Text style={styles.brandHint}>
              Searching by brand — cuisine filters paused
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  filterBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  filterBadgeText: { color: colors.textOnPrimary, fontSize: 11, fontWeight: '700' },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  brandField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  brandFieldActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  brandInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  brandHint: {
    fontSize: 11,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
});
