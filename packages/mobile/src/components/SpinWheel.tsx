import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { SavedRestaurant } from '../storage/types';
import { CUISINE_COLORS } from '../theme/cuisine';

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface Props {
  restaurants: SavedRestaurant[];
  onResult: (restaurant: SavedRestaurant) => void;
  onClose: () => void;
}

export function SpinWheel({ restaurants, onResult, onClose }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SavedRestaurant | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const winnerRef = useRef<SavedRestaurant | null>(null);

  // Create a long repeated list for smooth spinning
  const repeats = 10;
  const items = Array.from({ length: repeats }, () => restaurants).flat();

  const spin = useCallback(() => {
    if (spinning || restaurants.length < 2) return;
    setSpinning(true);
    setResult(null);

    const winnerIndex = Math.floor(Math.random() * restaurants.length);
    winnerRef.current = restaurants[winnerIndex];
    // Land in the middle of the repeated list for smooth animation
    const targetIndex = Math.floor(repeats / 2) * restaurants.length + winnerIndex;
    const targetY = targetIndex * ITEM_HEIGHT - ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);

    // Start from top
    scrollY.setValue(0);

    Animated.timing(scrollY, {
      toValue: targetY,
      duration: 3000 + Math.random() * 1000,
      useNativeDriver: true,
      easing: (t) => {
        // Custom easing: fast start, slow deceleration
        return 1 - Math.pow(1 - t, 4);
      },
    }).start(() => {
      setSpinning(false);
      setResult(winnerRef.current);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  }, [spinning, restaurants, scrollY, repeats]);

  if (restaurants.length < 2) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="sad-outline" size={48} color={colors.textLight} />
          <Text style={styles.emptyText}>
            You need at least 2 eligible restaurants to spin the wheel.
          </Text>
          <Text style={styles.emptySubtext}>
            Add more spots or wait for recently visited ones to cool down.
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spin the Wheel!</Text>

      <View style={styles.wheelContainer}>
        <View style={styles.indicator} />
        <View style={styles.wheelWindow}>
          <Animated.View
            style={[
              styles.wheelContent,
              { transform: [{ translateY: Animated.multiply(scrollY, -1) }] },
            ]}
          >
            {items.map((item, i) => {
              const bgColor = CUISINE_COLORS[item.cuisineType] || CUISINE_COLORS.other;
              return (
                <View key={i} style={[styles.wheelItem, { backgroundColor: bgColor + '15' }]}>
                  <View style={[styles.wheelDot, { backgroundColor: bgColor }]} />
                  <Text style={styles.wheelItemText} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
              );
            })}
          </Animated.View>
        </View>
      </View>

      {result && (
        <View style={styles.resultCard}>
          <Ionicons name="trophy" size={24} color={colors.accent} />
          <Text style={styles.resultTitle}>{result.name}</Text>
          <Text style={styles.resultAddress}>{result.address}</Text>
          <TouchableOpacity
            style={styles.resultAction}
            onPress={() => onResult(result)}
          >
            <Text style={styles.resultActionText}>View Details</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.spinButton, spinning && styles.spinButtonDisabled]}
        onPress={spin}
        disabled={spinning}
      >
        <Ionicons name="sync" size={20} color={colors.textOnPrimary} />
        <Text style={styles.spinButtonText}>
          {spinning ? 'Spinning...' : result ? 'Spin Again' : 'Spin!'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  wheelContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  indicator: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) - 1,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT + 2,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  wheelWindow: {
    height: WHEEL_HEIGHT,
    overflow: 'hidden',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  wheelContent: {},
  wheelItem: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  wheelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  wheelItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  resultAddress: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  resultAction: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
  },
  resultActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  spinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  spinButtonDisabled: { opacity: 0.6 },
  spinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textOnPrimary,
    marginLeft: spacing.sm,
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
