import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { MealType } from '../storage/types';

interface Props {
  selected: MealType;
  onSelect: (type: MealType) => void;
}

const MEAL_OPTIONS: Array<{ type: MealType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = [
  { type: 'coffee', label: 'Coffee', icon: 'cafe', color: colors.coffee },
  { type: 'lunch', label: 'Lunch', icon: 'restaurant', color: colors.lunch },
  { type: 'dinner', label: 'Dinner', icon: 'wine', color: colors.dinner },
];

export function MealTypePicker({ selected, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Meeting over?</Text>
      <View style={styles.pillRow}>
        {MEAL_OPTIONS.map(({ type, label, icon, color }) => {
          const isSelected = selected === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.pill,
                isSelected && { backgroundColor: color + '18', borderColor: color },
              ]}
              onPress={() => onSelect(type)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={icon}
                size={20}
                color={isSelected ? color : colors.textLight}
              />
              <Text
                style={[
                  styles.pillText,
                  isSelected && { color, fontWeight: '700' },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
});
