import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

interface Props {
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
}

export function FindButton({ onPress, disabled, loading }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={styles.wrapper}
    >
      <LinearGradient
        colors={disabled ? ['#CED4DA', '#ADB5BD'] : [colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.textOnPrimary} />
        ) : (
          <>
            <Ionicons name="search" size={20} color={colors.textOnPrimary} />
            <Text style={styles.text}>Find a Spot</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textOnPrimary,
    marginLeft: spacing.sm,
    letterSpacing: 0.3,
  },
});
