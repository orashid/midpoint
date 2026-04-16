import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

interface DeviceLocation {
  lat: number;
  lng: number;
}

interface DeviceLocationState {
  location: DeviceLocation | null;
  loading: boolean;
  permissionDenied: boolean;
}

/**
 * Returns the device's approximate current location, requesting foreground
 * permission on first use. Returns nulls if permission is denied or the OS
 * can't get a fix. Intended as a fallback when the user hasn't configured
 * a saved "home" address — e.g. to bias restaurant search results.
 */
export function useDeviceLocation(): DeviceLocationState {
  const [state, setState] = useState<DeviceLocationState>({
    location: null,
    loading: true,
    permissionDenied: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') {
          setState({ location: null, loading: false, permissionDenied: true });
          return;
        }
        const pos = await Location.getLastKnownPositionAsync({
          maxAge: 5 * 60 * 1000, // accept a fix up to 5 min old for speed
        });
        if (pos) {
          if (cancelled) return;
          setState({
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            loading: false,
            permissionDenied: false,
          });
          return;
        }
        // No cached fix — take a fresh one. Balanced accuracy is good enough
        // for search biasing (within a few hundred meters).
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setState({
          location: { lat: current.coords.latitude, lng: current.coords.longitude },
          loading: false,
          permissionDenied: false,
        });
      } catch {
        if (cancelled) return;
        setState({ location: null, loading: false, permissionDenied: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
