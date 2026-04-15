import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ResultCard } from './ResultCard';
import { Restaurant } from '../api/client';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface Props {
  restaurants: Restaurant[];
}

export function ResultsList({ restaurants }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Best spots for everyone
      </Text>
      <Text style={styles.subtitle}>
        Ranked by fairness of drive time + rating
      </Text>
      {restaurants.map((r, i) => (
        <ResultCard key={r.placeId} restaurant={r} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
});
