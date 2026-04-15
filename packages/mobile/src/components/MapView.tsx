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

export function MapView({ midpoint, restaurants, participants }: Props) {
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
});
