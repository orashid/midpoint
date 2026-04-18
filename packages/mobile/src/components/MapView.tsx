import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import RNMapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../theme/colors';
import { borderRadius, spacing } from '../theme/spacing';
import { Restaurant } from '../api/client';
import { ParticipantEntry } from '../hooks/useParticipants';

interface Props {
  midpoint: { lat: number; lng: number };
  restaurants: Restaurant[];
  participants: ParticipantEntry[];
}

// Error boundary so a map init failure (e.g., missing API key) doesn't
// take down the whole screen.
class MapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn('[MapView] render error:', error.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.container, styles.fallback]}>
          <Text style={styles.fallbackText}>Map unavailable</Text>
          <Text style={styles.fallbackSubtext}>
            Results below are ranked by distance and rating.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function MapViewInner({ midpoint, restaurants, participants }: Props) {
  const mapRef = useRef<RNMapView>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const allPoints = [
      { latitude: midpoint.lat, longitude: midpoint.lng },
      ...participants
        .filter((p) => p.lat !== null && p.lng !== null)
        .map((p) => ({ latitude: p.lat!, longitude: p.lng! })),
      ...restaurants.slice(0, 5).map((r) => ({ latitude: r.lat, longitude: r.lng })),
    ];

    if (allPoints.length > 1) {
      mapRef.current.fitToCoordinates(allPoints, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }
  }, [midpoint, restaurants, participants]);

  return (
    <View style={styles.container}>
      <RNMapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: midpoint.lat,
          longitude: midpoint.lng,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}
      >
        {/* Participant pins */}
        {participants
          .filter((p) => p.lat !== null && p.lng !== null)
          .map((p, i) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat!, longitude: p.lng! }}
              pinColor="#4A90D9"
              title={p.name || `Person ${i + 1}`}
            />
          ))}

        {/* Midpoint pin */}
        <Marker
          coordinate={{ latitude: midpoint.lat, longitude: midpoint.lng }}
          pinColor="#ADB5BD"
          title="Midpoint"
        />

        {/* Restaurant pins */}
        {restaurants.slice(0, 5).map((r, i) => (
          <Marker
            key={r.placeId}
            coordinate={{ latitude: r.lat, longitude: r.lng }}
            pinColor="#DC3545"
            title={`${i + 1}. ${r.name}`}
            description={`${r.rating} stars`}
          />
        ))}
      </RNMapView>
    </View>
  );
}

export function MapView(props: Props) {
  return (
    <MapErrorBoundary>
      <MapViewInner {...props} />
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    height: 280,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  fallback: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  fallbackText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  fallbackSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
