import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { borderRadius, spacing } from '../theme/spacing';

const MESSAGES = [
  'Finding the perfect midpoint...',
  'Searching for great spots...',
  'Calculating drive times...',
  'Almost there...',
];

export function LoadingOverlay() {
  const rotation = useRef(new Animated.Value(0)).current;
  const messageIndex = useRef(0);
  const [message, setMessage] = React.useState(MESSAGES[0]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    const interval = setInterval(() => {
      messageIndex.current = (messageIndex.current + 1) % MESSAGES.length;
      setMessage(MESSAGES[messageIndex.current]);
    }, 2000);

    return () => clearInterval(interval);
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="compass" size={40} color={colors.primary} />
        </Animated.View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  message: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
